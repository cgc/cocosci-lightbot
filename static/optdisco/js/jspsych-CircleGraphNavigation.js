import {parseHTML, runTimer, completeModal, trialErrorHandling, graphicsUrl, setTimeoutPromise, addPlugin} from './utils.js';
import {bfs} from './graphs.js';

const SUCCESSOR_KEYS = ['J', 'K', 'L'];

class CircleGraph {
  constructor(options) {
    this.options = options;
    options.edgeShow = options.edgeShow || (() => true);
    options.successorKeys = options.graphRenderOptions.successorKeys || options.stateOrder.map(() => SUCCESSOR_KEYS);

    this.el = parseHTML(renderCircleGraph(
      options.graph, options.graphics, options.goal, options.stateOrder,
      {
        edgeShow: options.edgeShow,
        successorKeys: options.successorKeys,
        ...options.graphRenderOptions,
      }
    ));

    this.setCurrentState(options.start);

    // Making sure it is easy to clean up event listeners...
    this.cancel = [];
  }

  setCurrentState(state) {
    this.state = state;
    setCurrentState(this.el, this.options.graph, this.state, {
      edgeShow: this.options.edgeShow,
      successorKeys: this.options.successorKeys,
    });
  }

  keyCodeToState(keyCode) {
    /*
    Mapping keyCode to states.
    */
    const key = String.fromCharCode(keyCode).toUpperCase();
    const idx = this.options.successorKeys[this.state].indexOf(key);
    if (idx === -1) {
      return null;
    }
    const succ = this.options.graph.graph[this.state][idx];
    if (!this.options.edgeShow(this.state, succ)) {
      return null;
    }
    return succ;
  }

  keyTransition() {
    /*
    Returns a promise that is resolved with {state} when there is a keypress
    corresponding to a valid state transition.
    */
    const p = documentEventPromise('keypress', (e) => {
      const state = this.keyCodeToState(e.keyCode);
      if (state !== null) {
        e.preventDefault();
        return {state};
      }
    });

    this.cancel.push(p.cancel);

    return p;
  }

  async navigate() {
    /*
    Higher-order function that stitches together other class methods
    for an interactive key-based navigation.
    */
    const startTime = Date.now();
    const data = {
      times: [],
      states: [this.state],
    };

    while (true) {
      // State transition
      const {state} = await this.keyTransition();
      // Record information
      data.states.push(state);
      data.times.push(Date.now() - startTime);
      // Termination condition, intentionally avoiding calling cg.setCurrentState() below to avoid rendering.
      if (state == this.options.goal) {
        break;
      }
      // Taking a pause...
      await setTimeoutPromise(200);
      // Update state
      this.setCurrentState(state);
    }

    return data;
  }
}

const stateTemplate = (state, graphic, options) => {
  let cls = `GraphNavigation-State-${state}`;
  if (options.goal) {
    cls += ' GraphNavigation-goal';
  }
  if (options.probe) {
    cls += ' GraphNavigation-probe';
  }
  return `
  <div class="State GraphNavigation-State ${cls || ''}" style="${options.style || ''}" data-state="${state}"></div>
  `;
};

const renderSmallEmoji = (graphic, sty) => `
<span style="border-radius:100%;width:4rem;height:4rem;display:inline-block;${sty||''}"></span>
`;

export function renderCircleGraph(graph, gfx, goal, stateOrder, options) {
  options = options || {};
  options.edgeShow = options.edgeShow || (() => true);
  const successorKeys = options.successorKeys;
  /*
  An optional parameter is fixedXY. This requires x,y coordinates that are in
  [-1, 1]. The choice of range is a bit arbitrary; results from code that assumes
  the output of sin/cos.
  */
  const fixedXY = options.fixedXY;
  // Controls how far the key is from the node center. Scales keyWidth/2.
  const keyDistanceFactor = options.keyDistanceFactor || 1.4;
  // Scales edges and keys in. Good for when drawn in a circle
  // since it can help avoid edges overlapping neighboring nodes.
  const scaleEdgeFactor = options.scaleEdgeFactor || 0.95;

  const width = options.width || 600;
  const height = options.height || 600;
  const blockSize = 100;
  const radiusY = options.radiusY || 250;
  const radiusX = options.radiusX || 250;
  const offsetX = width / 2 - blockSize / 2;
  const offsetY = height / 2 - blockSize / 2;

  const stateToXY = {};

  stateOrder.forEach((state, idx) => {
    if (fixedXY) {
      let x = fixedXY[state][0] * radiusX + offsetX;
      let y = fixedXY[state][1] * radiusY + offsetY;
      stateToXY[state] = [x, y];
      return;
    }
    const angle = idx * 2 * Math.PI / graph.states.length;
    let x = Math.cos(angle) * radiusX + offsetX;
    let y = Math.sin(angle) * radiusY + offsetY;
    stateToXY[state] = [x, y];
  });

  const states = stateOrder.map(state => {
    const [x, y] = stateToXY[state];
    return stateTemplate(state, gfx[state], {
      probe: state == options.probe,
      goal: state == goal,
      style: `transform: translate(${x}px,${y}px);`,
    });
  });

  function scaleEdge(pos, offset) {
    /*
    We scale edges/keys in to ensure that short connections avoid overlapping node borders.
    */
    return (pos - offset) * scaleEdgeFactor + offset;
  }
  function scaleCoordinate([x, y]) {
    return [
      scaleEdge(x, offsetX),
      scaleEdge(y, offsetY),
    ];
  }

  function addKey(key, state, successor, norm) {
    const [x, y] = scaleCoordinate(stateToXY[state]);
    const [sx, sy] = scaleCoordinate(stateToXY[successor]);
    const [keyWidth, keyHeight] = [20, 28]; // HACK get from CSS
    // We also add the key labels here
    const mul = keyDistanceFactor * blockSize / 2;
    keys.push(`
      <div class="GraphNavigation-key GraphNavigation-key-${state}-${successor} GraphNavigation-key-${key}" style="
        transform: translate(
          ${x + blockSize/2 - keyWidth/2 + mul * (sx-x)/norm}px,
          ${y + blockSize/2 - keyHeight/2 + mul * (sy-y)/norm}px)
      ">${key}</div>
    `);
  }

  const succ = [];
  const keys = [];
  for (const state of graph.states) {
    let [x, y] = scaleCoordinate(stateToXY[state]);

    graph.graph[state].forEach((successor, idx) => {
      if (state >= successor) {
        return;
      }
      let [sx, sy] = scaleCoordinate(stateToXY[successor]);
      const norm = Math.sqrt(Math.pow(x-sx, 2) + Math.pow(y-sy, 2));
      const rot = Math.atan2(sy-y, sx-x);
      const opacity = options.edgeShow(state, successor) ? 1 : 0;
      succ.push(`
        <div class="GraphNavigation-edge GraphNavigation-edge-${state}-${successor}" style="
        width: ${norm}px;
        opacity: ${opacity};
        transform: translate(${x+blockSize/2}px,${y+blockSize/2}px) rotate(${rot}rad);
        "></div>
      `);

      // We also add the key labels here
      addKey(successorKeys[state][idx], state, successor, norm);
      addKey(successorKeys[successor][graph.graph[successor].indexOf(state)], successor, state, norm);
    });
  }

  return `
  <div class="GraphNavigation NoPicture" style="width: ${width}px; height: ${height}px;">
    ${keys.join('')}
    ${succ.join('')}
    ${states.join('')}
  </div>
  `;
}

function queryEdge(root, state, successor) {
  /*
  Returns the edge associated with nodes `state` and `successor`. Since we only
  have undirected graphs, they share an edge, so some logic is needed to find it.
  */
  if (state < successor) {
    return root.querySelector(`.GraphNavigation-edge-${state}-${successor}`);
  } else {
    return root.querySelector(`.GraphNavigation-edge-${successor}-${state}`);
  }
}

const ALL_KEYS = ['J', 'K', 'L', 'I'];

export function setCurrentState(display_element, graph, state, options) {
  options = options || {};
  options.edgeShow = options.edgeShow || (() => true);

  const successorKeys = options.successorKeys[state];

  // Remove old classes!
  function removeClass(cls) {
    const els = display_element.querySelectorAll('.' + cls);
    for (const e of els) {
      e.classList.remove(cls);
    }
  }
  removeClass('GraphNavigation-current')
  removeClass('GraphNavigation-currentEdge')
  removeClass('GraphNavigation-currentKey')
  for (const key of ALL_KEYS) {
    removeClass(`GraphNavigation-currentEdge-${key}`)
    removeClass(`GraphNavigation-currentKey-${key}`)
  }

  // Can call this to clear out current state too.
  if (state == null) {
    return;
  }

  // Add new classes! Set current state.
  display_element.querySelector(`.GraphNavigation-State-${state}`).classList.add('GraphNavigation-current');
  graph.graph[state].forEach((successor, idx) => {
    if (!options.edgeShow(state, successor)) {
      return;
    }

    // Set current edges
    let el = queryEdge(display_element, state, successor);
    el.classList.add('GraphNavigation-currentEdge');
    el.classList.add(`GraphNavigation-currentEdge-${successorKeys[idx]}`);

    // Now setting active keys
    el = display_element.querySelector(`.GraphNavigation-key-${state}-${successor}`);
    el.classList.add('GraphNavigation-currentKey');
    el.classList.add(`GraphNavigation-currentKey-${successorKeys[idx]}`);
  });

  // HACK HACK DELETE
  // HACK HACK DELETE
  // HACK HACK DELETE
  // We return a dictionary from keyCode to successor state.
  const keyToState = {};

  const lowerCase = 'a'.charCodeAt(0) - 'A'.charCodeAt(0);
  graph.graph[state].forEach((succ, idx) => {
    keyToState[successorKeys[idx].charCodeAt(0)] = succ;
    keyToState[successorKeys[idx].charCodeAt(0) + lowerCase] = succ;
  });

  return keyToState;
}

export function showState(el, graph, state) {
  let resolve;
  let promise = new Promise(function(res, rej) {
    resolve = res;
  });

  const keyToState = setCurrentState(el, graph, state);

  function cancel() {
    document.removeEventListener('keypress', handleTransition);
    resolve(null);
  }

  function handleTransition(e) {
    e.preventDefault();
    if (e.keyCode in keyToState) {
      document.removeEventListener('keypress', handleTransition);
      resolve(keyToState[e.keyCode]);
    }
  }
  document.addEventListener('keypress', handleTransition);

  const rv = promise.then((state) => {
    return setTimeoutPromise(200).then(() => {
      return state;
    });
  });
  return {
    cancel,
    promise: rv,
  };
}

function enableHoverEdges(display_element, graph) {
  for (const el of display_element.querySelectorAll('.GraphNavigation-State')) {
    el.addEventListener('mouseenter', function(e) {
      const state = parseInt(el.dataset.state, 10);
      // hovers.push({state, time: Date.now() - startTime});

      for (const edge of display_element.querySelectorAll('.GraphNavigation-edge')) {
        edge.classList.add('is-faded');
      }
      for (const successor of graph.graph[state]) {
        const el = queryEdge(display_element, state, successor);
        el.classList.remove('is-faded');
      }
    });
    el.addEventListener('mouseleave', function(e) {
      for (const edge of display_element.querySelectorAll('.GraphNavigation-edge')) {
        edge.classList.remove('is-faded');
      }
    });
  }
}

addPlugin('CircleGraphNavigation', trialErrorHandling(async function(root, trial) {
  console.log(trial);

  const cg = new CircleGraph(trial);
  root.innerHTML = `
  Navigate to ${renderSmallEmoji(trial.graphics[trial.goal], 'background-color: red;')}
  `;
  root.appendChild(cg.el);

  const data = await cg.navigate();

  console.log(data);

  await completeModal(`
    ### Success!
    Press spacebar or click to continue.
  `);

  root.innerHTML = '';
  jsPsych.finishTrial(data);
}));

jsPsych.plugins.CircleGraphNavigation1 = (function() {

  var plugin = {};
  plugin.info = {
    name: 'CircleGraphNavigation1',
    parameters: {}
  };

  plugin.trial = trialErrorHandling(async function(display_element, trial) {
    console.log(trial);

    const startTime = Date.now();
    const data = {
      times: [],
      states: [],
    };
    /*
    TODO record successor orderings?
    record images used
    */

    const graphEl = renderCircleGraph(trial.graph, trial.graphics, trial.goal, trial.stateOrder, trial.graphRenderOptions);
    const intro = `
    Navigate to ${renderSmallEmoji(trial.graphics[trial.goal], 'background-color: red;')}
    `;
    display_element.innerHTML = `${intro}${graphEl}`;

    if (trial.hoverEdges) {
      enableHoverEdges(display_element, trial.graph);
    }

    async function recursiveShowState(el, graph, graphics, start, goal) {
      const state = await showState(el, graph, start).promise;
      data.times.push(Date.now() - startTime);

      let path;
      if (state === goal) {
        path = [goal];
      } else {
        path = await recursiveShowState(el, graph, graphics, state, goal);
      }

      return [start].concat(path);
    }

    return recursiveShowState(display_element, trial.graph, trial.graphics, trial.start, trial.goal).then(function(path) {
      data.states = path;
      console.log(data);
      const perfect = path.length - 1 == trial.optimal ? "" : "";
      return completeModal(`
        ### Success!
        Press spacebar or click to continue.
        ${perfect}
      `);
    }).then(function() {
      display_element.innerHTML = ''; // HACK???
      jsPsych.finishTrial(data);
    });
  });

  return plugin;
})();

const MAX_CLICKS = 15; // should be tuned per graph???

function showPathIdentification(el, graph, graphics, start, goal, clickLimit, timeLimit) {
  let resolve;
  let promise = new Promise(function(res, rej) {
    resolve = res;
  });

  const startTime = Date.now();

  const optimalPath = bfs(graph, start, goal).path;

  function isOptimal() {
    // Can't be right if they haven't selected the right number of items.
    if (selected.size != optimalPath.length) {
      return false;
    }

    function successors(state) {
      return graph.graph[state].filter(s => selected.has(s));
    }

    const result = bfs(graph, start, goal, {successors});
    // Can't be right if there's no solution in a BFS that filters based on selected.
    if (!result) {
      return false;
    }
    // Right if their path is the same length as optimal.
    // Notably, they don't have to have the same path.
    return result.path.length == optimalPath.length;
  }

  const selected = new Set([goal]);

  const data = {
    selected,
    totalClicks: 0,
    times: [],
    actions: [],
  };

  if (timeLimit) {
    setTimeout(() => {
      resolve({success: false, timeout: true, ...data});
    }, timeLimit);
  }

  for (const s of el.querySelectorAll('.PathIdentification-selectable')) {
    if (s == start || s == goal) {
      continue;
    }
    s.addEventListener('click', function(e) {
      e.preventDefault();
      const state = parseInt(s.getAttribute('data-state'), 10);
      const select = !selected.has(state);

      // record data
      data.times.push(Date.now() - startTime);
      data.actions.push({state, select});

      // Toggle logic
      if (select) {
        selected.add(state);
        s.classList.add('PathIdentification-selected');
      } else {
        selected.delete(state);
        s.classList.remove('PathIdentification-selected');
      }

      // Check to see if they solved it
      if (isOptimal()) {
        resolve({success: true, ...data});
        return;
      }

      // Check to see if they exceeded # of clicks.
      data.totalClicks++;
      if (data.totalClicks >= clickLimit) {
        resolve({success: false, ...data});
        return;
      }
    });
  }

  return promise;
}

jsPsych.plugins.CirclePathIdentification = (function() {
  const plugin = { info: { name: 'CirclePathIdentification', parameters: {} } };

  plugin.trial = trialErrorHandling(async function(display_element, trial) {
    console.log(trial);

    const {start, goal, graph, graphics, stateOrder} = trial;
    const solution = bfs(graph, start, goal).path;

    const msg = trial.busStop ? `
      <p>Imagine a version of this task that includes instant teleportation to one circle of your choice. The task is otherwise exactly the same: you navigate between the same circles along the same connections, but you can also teleport to the circle you choose.</p>

      <p>If you did the task again, which circle would you choose to use for instant teleportation?</p>
    ` : `
      <p>What's the first circle you think of when navigating from ${renderSmallEmoji(graphics[start], 'background-color: green')} to ${renderSmallEmoji(graphics[goal], 'background-color: red;')}?</p>
    `;

    const intro = trial.identifyOneState ? msg : `
      <p>Select the ${solution.length-1} picture(s) you would visit to get from ${renderSmallEmoji(graphics[start])}
      to ${renderSmallEmoji(graphics[goal])}. Selected pictures are gray. Only select the pictures you need to navigate through.</p>
    `;
    const graphEl = renderCircleGraph(graph, graphics, goal, stateOrder, trial.graphRenderOptions);
    const timer = `<div class='Timer'></div>`;
    display_element.innerHTML = `${intro}${timer}${graphEl}`;

    // Add styling/classes for selectable states.
    for (const s of graph.states) {
      let cls = 'PathIdentification-selectable';
      if (s == start) {
        cls = 'GraphNavigation-current';
      } else if (s == goal) {
        continue; // HACK HACK
        continue; // HACK HACK
        cls = 'PathIdentification-goal';
        continue; // HACK HACK
        continue; // HACK HACK
      }
      const el = display_element.querySelector(`.GraphNavigation-State-${s}`);
      el.classList.add(cls);
    }

    // Start timer
    if (trial.timeLimit) {
      runTimer(display_element.querySelector('.Timer'), trial.timeLimit);
    }

    const clickLimit = trial.identifyOneState ? 1 : MAX_CLICKS;
    return showPathIdentification(display_element, graph, graphics, start, goal, clickLimit, trial.timeLimit).then(function(data) {
      console.log(data);
      data.busStop = trial.busStop;
      data.practice = trial.practice;

      // Simply removing timer is a pretty good way to remove the timer's visual
      // if there isn't a timeout. May want to leave it in if there is a timeout?
      if (trial.timeLimit) {
        display_element.querySelector('.Timer').remove();
      }

      let msg;
      const cont = '\n\nPress spacebar or click to continue.';
      if (trial.identifyOneState) {
        msg = data.timeout ? '### Ran out of time' : '';
      } else {
        msg = data.success ? `### Success!` : `
        ### Ran out of clicks!
        Sorry, you exceeded the maximum number of ${MAX_CLICKS} clicks.
        `;
      }
      return completeModal(msg+cont).then(function() {
        display_element.innerHTML = '';
        jsPsych.finishTrial(data);
      });
    });
  });

  return plugin;
})();

class PromiseCancellation extends Error {
  constructor() {
    super("PromiseCancellation");
    this.name = this.message;
  }
}

function documentEventPromise(eventName, fn) {
  // Adds event handler to document that runs until the function `fn` returns a truthy value.
  const el = document;
  let cancel;
  const p = new Promise((resolve, reject) => {

    // Can be cancelled. Results in Error of PromiseCancellation.
    cancel = function() {
      el.removeEventListener(eventName, handler);
      reject(new PromiseCancellation());
    };

    function handler(e) {
      const rv = fn(e);
      if (rv) {
        el.removeEventListener(eventName, handler);
        resolve(rv);
      }
    }

    el.addEventListener(eventName, handler);
  });
  p.cancel = () => cancel();
  return p;
}

function endTrialScreen(root, msg) {
  root.innerHTML = `<h2 style="margin-top: 20vh;margin-bottom:100vh;">${msg || ''}Press spacebar to continue.</h2>`;
  return documentEventPromise('keypress', (e) => {
    if (e.keyCode == 32) {
      e.preventDefault();
      return true;
    }
  });
}

function renderKeyInstruction(keys) {
  function renderInputInstruction(inst) {
    return `<span style="border: 1px solid black; border-radius: 3px; padding: 3px; font-weight: bold; display: inline-block;">${inst}</span>`;
  }

  if (keys.accept == 'Q') {
    return `${renderInputInstruction('Yes (q)')} &nbsp; ${renderInputInstruction('No (p)')}`;
  } else {
    return `${renderInputInstruction('No (q)')} &nbsp; ${renderInputInstruction('Yes (p)')}`;
  }
}

addPlugin('AcceptRejectPractice', trialErrorHandling(async function(root, trial) {
  const {expectedResponse, acceptRejectKeys: keys} = trial;
  root.innerHTML = `
    Respond with "${expectedResponse == keys.accept ? 'Yes' : 'No'}".
    <br/><br/><br/>
    ${renderKeyInstruction(keys)}
    <br/>
  `;

  await documentEventPromise('keypress', e => {
    const input = String.fromCharCode(e.keyCode);
    if (input.toUpperCase() == expectedResponse) {
      e.preventDefault();
      return true;
    }
  });

  await endTrialScreen(root, 'Great!<br /><br />');

  root.innerHTML = '';
  jsPsych.finishTrial({practice: true});
}));

addPlugin('AcceptReject', trialErrorHandling(async function(root, trial) {
  const {start, goal, graph, graphics, stateOrder, probe, acceptRejectKeys: keys} = trial;

  const intro = `
  <p>Navigating from ${renderSmallEmoji(graphics[start], 'background-color: green;')} to ${renderSmallEmoji(graphics[goal], 'background-color: red;')}.
  Will you pass ${renderSmallEmoji(graphics[probe], 'background-color: rgb(252,233,68);')}?<br />
  ${renderKeyInstruction(keys)}
  `;

  const graphEl = renderCircleGraph(graph, graphics, goal, stateOrder, {
    probe,
    ...trial.graphRenderOptions,
  });
  root.innerHTML = `${intro}${graphEl}`;

  for (const s of graph.states) {
    let cls;
    if (s == start) {
      //cls = 'PathIdentification-start';
      cls = 'GraphNavigation-current';
    } else if (s == goal) {
      //cls = 'PathIdentification-goal';
    } else if (s == probe) {
      //cls = 'PathIdentification-probe';
    }
    if (!cls) {
      continue;
    }
    const el = root.querySelector(`.GraphNavigation-State-${s}`);
    el.classList.add(cls);
  }

  const keyCodeSubmit = [13, 32]; // Add newline & space
  const lowerCase = 'a'.charCodeAt(0) - 'A'.charCodeAt(0);
  for (const response of Object.keys(keys)) {
    const code = keys[response].charCodeAt(0);
    keyCodeSubmit.push(code);
    keyCodeSubmit.push(code + lowerCase);
  }

  const startTime = Date.now();

  return documentEventPromise('keypress', e => {
    for (const response of Object.keys(keys)) {
      const code = keys[response].charCodeAt(0);

      if (e.keyCode == code || e.keyCode == code + lowerCase) {
        e.preventDefault();
        return {response};
      }
    }
  }).then(data => {
    console.log(data);
    data.practice = trial.practice;
    data.rt = Date.now() - startTime;
    return endTrialScreen(root).then(function() {
      root.innerHTML = '';
      jsPsych.finishTrial(data);
    });
  });
}));
