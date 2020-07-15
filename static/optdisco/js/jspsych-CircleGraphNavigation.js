import {parseHTML, runTimer, completeModal, trialErrorHandling, graphicsUrl, setTimeoutPromise, addPlugin} from './utils.js';
import {bfs} from './graphs.js';

const SUCCESSOR_KEYS = ['J', 'K', 'L'];

export class CircleGraph {
  constructor(options) {
    this.options = options;
    options.edgeShow = options.edgeShow || (() => true);
    options.successorKeys = options.graphRenderOptions.successorKeys || options.stateOrder.map(() => SUCCESSOR_KEYS);

    this.el = parseHTML(renderCircleGraph(
      options.graph, options.graphics, options.goal, options.stateOrder,
      {
        edgeShow: options.edgeShow,
        successorKeys: options.successorKeys,
        probe: options.probe,
        ...options.graphRenderOptions,
      }
    ));

    this.setCurrentState(options.start);

    // Making sure it is easy to clean up event listeners...
    this.cancellables = [];
  }

  cancel() {
    // Use this for early termination of the graph.
    // Only used during free-form graph navigation.
    for (const c of this.cancellables) {
      c();
    }
    this.cancellables = [];
  }

  setCurrentState(state, options) {
    this.state = state;
    setCurrentState(this.el, this.options.graph, this.state, {
      edgeShow: this.options.edgeShow,
      successorKeys: this.options.successorKeys,
      ...options,
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

    this.cancellables.push(p.cancel);

    return p;
  }

  clickTransition(options) {
    options = options || {};
    /*
    Returns a promise that is resolved with {state} when there is a click
    corresponding to a valid state transition.
    */
    const invalidStates = new Set(options.invalidStates || [this.state, this.options.goal]);

    for (const s of this.options.graph.states) {
      if (invalidStates.has(s)) {
        continue;
      }
      const el = this.el.querySelector(`.GraphNavigation-State-${s}`);
      el.classList.add('PathIdentification-selectable');
    }

    return new Promise(function(resolve, reject) {
      function handler(e) {
        if (!e.target.classList.contains('PathIdentification-selectable')) {
          return;
        }
        e.preventDefault();
        const state = parseInt(e.target.getAttribute('data-state'), 10);

        document.removeEventListener('click', handler);
        resolve({state});
      }

      document.addEventListener('click', handler);
    });
  }

  async navigate(options) {
    options = options || {};
    const termination = options.termination || ((state, states) => state == this.options.goal);
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
      if (termination(state, data.states)) {
        break;
      }
      // Update state
      this.setCurrentState(state);
      // Taking a pause...
      await setTimeoutPromise(200);
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

export const renderSmallEmoji = (graphic, cls) => `
<span style="border-radius:100%;width:4rem;height:4rem;display:inline-block;margin-bottom:-1rem;" class="${cls||''}"></span>
`;

function renderCircleGraph(graph, gfx, goal, stateOrder, options) {
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

function setCurrentState(display_element, graph, state, options) {
  options = options || {};
  options.edgeShow = options.edgeShow || (() => true);
  // showCurrentEdges enables rendering of current edges/keys. This is off for PathIdentification and AcceptReject.
  options.showCurrentEdges = typeof(options.showCurrentEdges) === 'undefined' ? true : options.showCurrentEdges;
  const allKeys = _.unique(_.flatten(options.successorKeys));

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
  for (const key of allKeys) {
    removeClass(`GraphNavigation-currentEdge-${key}`)
    removeClass(`GraphNavigation-currentKey-${key}`)
  }

  // Can call this to clear out current state too.
  if (state == null) {
    return;
  }

  // Add new classes! Set current state.
  display_element.querySelector(`.GraphNavigation-State-${state}`).classList.add('GraphNavigation-current');

  if (!options.showCurrentEdges) {
    return;
  }

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
  Navigate to ${renderSmallEmoji(trial.graphics[trial.goal], 'GraphNavigation-goal')}. It might be helpful to set subgoals.
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

addPlugin('VisitNeighbors', trialErrorHandling(async function(root, trial) {
  console.log(trial);

  function edgeShow(state, succ) {
    return trial.start == state || trial.start == succ;
  }

  const cg = new CircleGraph({...trial, edgeShow});
  root.innerHTML = `
    Visit *all* the locations connected to your starting location.
    Then return to the start place!
  `;
  root.appendChild(cg.el);
  cg.el.querySelector('.GraphNavigation-current').classList.add('GraphNavigation-visited');

  const neighbors = trial.graph.graph[trial.start];
  const data = await cg.navigate({termination: function(state, states) {
    // Kind of a HACK.
    cg.el.querySelector(`.GraphNavigation-State-${state}`).classList.add('GraphNavigation-visited');
    states = new Set(states);
    return state == trial.start && neighbors.every(n => states.has(n));
  }});

  await completeModal(`
    ### Success!
    Press spacebar or click to continue.
  `);

  root.innerHTML = '';
  jsPsych.finishTrial(data);
}));

addPlugin('CGTransition', trialErrorHandling(async function(root, trial) {
  console.log(trial);

  const instruction = document.createElement('div');
  instruction.classList.add('GraphNavigation-instruction');
  root.appendChild(instruction);
  instruction.innerHTML = `Study the connections of the ${renderSmallEmoji(null, 'GraphNavigation-cue')}. You\'ll be quizzed on one of them. Press spacebar to continue.`;

  const cg = new CircleGraph({...trial, start: null});
  root.appendChild(cg.el);

  const cues = trial.cues.map(state => cg.el.querySelector(`.GraphNavigation-State-${state}`));
  cues.forEach(cue => cue.classList.add('GraphNavigation-cue'));

  await documentEventPromise('keypress', (e) => {
    if (e.keyCode == 32) {
      e.preventDefault();
      return true;
    }
  });

  instruction.innerHTML = '<br />';
  Array.from(cg.el.querySelectorAll('.GraphNavigation-edge')).forEach(el => { el.style.opacity = 0; });

  await setTimeoutPromise(500);

  cues.forEach(cue => cue.classList.remove('GraphNavigation-cue'));
  cg.setCurrentState(trial.start, {showCurrentEdges: false});

  const start = Date.now();
  const data = {states: [], times: []};
  let totalCorrect = 0;
  const neighbors = trial.graph.graph[trial.start];

  for (const t of _.range(3)) {
    const left = 3-t;
    instruction.textContent = `Click on the connected locations! ${left} click${left==1?'':'s'} left.`;

    const {state} = await cg.clickTransition({invalidStates: [trial.start].concat(data.states)});
    data.states.push(state);
    data.times.push(Date.now() - start);

    const el = cg.el.querySelector(`.GraphNavigation-State-${state}`);
    el.classList.remove('PathIdentification-selectable');
    el.style.backgroundColor = 'grey';

    const correct = neighbors.includes(state);
    if (correct) {
      totalCorrect++;
    }
  }

  Array.from(cg.el.querySelectorAll('.GraphNavigation-edge')).forEach(el => { el.style.opacity = 1; });
  instruction.innerHTML = `
    You correctly guessed ${totalCorrect}. Press spacebar or click to continue.
  `;

  for (const state of new Set(neighbors.concat(data.states))) {
    const el = cg.el.querySelector(`.GraphNavigation-State-${state}`);
    el.classList.remove('PathIdentification-selectable');

    if (neighbors.includes(state)) {
      // Correct selection
      if (data.states.includes(state)) {
        el.style.backgroundColor = 'green';
      // Correct, but not selected
      } else {
        el.style.border = '4px solid green';
        el.style.backgroundColor = 'white';
      }
    } else {
      // Incorrect selection
      el.style.backgroundColor = 'red';
    }
  }

  await documentEventPromise('keypress', (e) => {
    if (e.keyCode == 32) {
      e.preventDefault();
      return true;
    }
  });

  root.innerHTML = '';
  jsPsych.finishTrial(data);
}));

addPlugin('CirclePathIdentification', trialErrorHandling(async function(root, trial) {
  console.log(trial);
  if (!trial.identifyOneState) {
    throw new Error('No path selection supported. Only one-state selection.');
  }

  const {start, goal, graph, graphics, stateOrder} = trial;
  const solution = bfs(graph, start, goal).path;

  const intro = trial.busStop ? `
    <p>Imagine a version of this task that includes instant teleportation to one location of your choice. The task is otherwise exactly the same: you navigate between the same locations along the same connections, but you can also teleport to the location you choose.</p>

    <p>If you did the task again, which location would you choose to use for instant teleportation?</p>
  ` : `
    <p>On this trial, what location would you set as a subgoal? (If none, click on the goal).</p>
  `;

  const cg = new CircleGraph({...trial, start: null});
  cg.setCurrentState(start, {showCurrentEdges: false});
  root.innerHTML = `${intro}`;
  root.appendChild(cg.el);

  const startTime = Date.now();
  const data = {
    times: [],
    states: [],
    busStop: trial.busStop,
    practice: trial.practice,
  };

  const {state} = await cg.clickTransition({invalidStates: [trial.start]});

  data.states.push(state);
  data.times.push(Date.now() - startTime);

  await completeModal('Press spacebar or click to continue.');

  root.innerHTML = '';
  jsPsych.finishTrial(data);
}));

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
  <p>Navigating from ${renderSmallEmoji(graphics[start], 'GraphNavigation-current')} to ${renderSmallEmoji(graphics[goal], 'GraphNavigation-goal')}.
  Will you pass ${renderSmallEmoji(graphics[probe], 'GraphNavigation-probe')}?<br />
  ${renderKeyInstruction(keys)}
  `;
  root.innerHTML = `${intro}`;
  const cg = new CircleGraph({...trial, start: null});
  cg.setCurrentState(start, {showCurrentEdges: false});
  root.appendChild(cg.el);

  const startTime = Date.now();

  const data = await documentEventPromise('keypress', e => {
    const input = String.fromCharCode(e.keyCode).toUpperCase();
    for (const response of Object.keys(keys)) {
      if (input == keys[response]) {
        e.preventDefault();
        return {response};
      }
    }
  });

  console.log(data);
  data.practice = trial.practice;
  data.rt = Date.now() - startTime;

  await endTrialScreen(root);

  root.innerHTML = '';
  jsPsych.finishTrial(data);
}));
