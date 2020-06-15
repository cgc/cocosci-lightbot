import {runTimer, completeModal, trialErrorHandling, graphicsUrl, setTimeoutPromise, addPlugin} from './utils.js';
import {bfs} from './graphs.js';

const stateTemplate = (state, graphic, cls, style) => `
<div class="State GraphNavigation-State ${cls || ''}" style="${style || ''}" data-state="${state}"><img src="${graphicsUrl(graphic)}" /></div>
`;

const SUCCESSOR_KEYS = ['J', 'K', 'L'];

export function renderCircleGraph(graph, gfx, goal, stateOrder) {
  const width = 600;
  const height = 600;
  const blockSize = 100;
  const radiusY = 250;
  const radiusX = 250;
  const offsetX = width / 2 - blockSize / 2;
  const offsetY = height / 2 - blockSize / 2;

  const stateToXY = {};

  stateOrder.forEach((state, idx) => {
    const angle = idx * 2 * Math.PI / graph.states.length;
    let x = Math.cos(angle) * radiusX + offsetX;
    let y = Math.sin(angle) * radiusY + offsetY;
    stateToXY[state] = [x, y];
  });

  const states = stateOrder.map(state => {
    const [x, y] = stateToXY[state];
    const cls = `GraphNavigation-State-${state} ${state == goal ? 'GraphNavigation-goal' : ''}`;
    return stateTemplate(state, gfx[state], cls, `transform: translate(${x}px,${y}px);`);
  });

  function scaleEdge(pos, offset) {
    /*
    We scale edges/keys in to ensure that short connections avoid overlapping node borders.
    */
    return (pos - offset) * 0.95 + offset;
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
    const mul = 1.4 * blockSize / 2;
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
      succ.push(`
        <div class="GraphNavigation-edge GraphNavigation-edge-${state}-${successor}" style="
        width: ${norm}px;
        transform: translate(${x+blockSize/2}px,${y+blockSize/2}px) rotate(${rot}rad);
        "></div>
      `);

      // We also add the key labels here
      addKey(SUCCESSOR_KEYS[idx], state, successor, norm);
      addKey(SUCCESSOR_KEYS[graph.graph[successor].indexOf(state)], successor, state, norm);
    });
  }

  return `
  <div class="GraphNavigation" style="width: ${width}px; height: ${height}px;">
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

export function setCurrentState(display_element, graph, state) {
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
  for (const key of SUCCESSOR_KEYS) {
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
    // Set current edges
    let el = queryEdge(display_element, state, successor);
    el.classList.add('GraphNavigation-currentEdge');
    el.classList.add(`GraphNavigation-currentEdge-${SUCCESSOR_KEYS[idx]}`);

    // Now setting active keys
    el = display_element.querySelector(`.GraphNavigation-key-${state}-${successor}`);
    el.classList.add('GraphNavigation-currentKey');
    el.classList.add(`GraphNavigation-currentKey-${SUCCESSOR_KEYS[idx]}`);
  });

  // We return a dictionary from keyCode to successor state.
  const keyToState = {};

  const upperCase = 'a'.charCodeAt(0) - 'A'.charCodeAt(0);
  graph.graph[state].forEach((succ, idx) => {
    keyToState[SUCCESSOR_KEYS[idx].charCodeAt(0)] = succ;
    keyToState[SUCCESSOR_KEYS[idx].charCodeAt(0) + upperCase] = succ;
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

jsPsych.plugins.CircleGraphNavigation = (function() {

  var plugin = {};
  plugin.info = {
    name: 'CircleGraphNavigation',
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

    const graphEl = renderCircleGraph(trial.graph, trial.graphics, trial.goal, trial.stateOrder);
    const intro = `
    Navigate to ${renderSmallEmoji(trial.graphics[trial.goal])}
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
      const perfect = path.length - 1 == trial.optimal ? "That was perfect!" : "";
      return completeModal(`
        ### Success!
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

const renderSmallEmoji = (graphic) => `
<img src="${graphicsUrl(graphic)}" style="width:6rem;height:6rem;" />
`;

jsPsych.plugins.CirclePathIdentification = (function() {
  const plugin = { info: { name: 'CirclePathIdentification', parameters: {} } };

  plugin.trial = trialErrorHandling(async function(display_element, trial) {
    console.log(trial);

    const {start, goal, graph, graphics, stateOrder} = trial;
    const solution = bfs(graph, start, goal).path;

    const msg = trial.busStop ? `
      <p>Now, we'll ask you one final question. Imagine a version of this task that includes instant teleportation to one picture of your choice. The task is otherwise exactly the same: you navigate between the same pictures along the same connections, but you can also teleport to the picture you choose.</p>

      <p>If you did the task again, which picture would you choose to use for instant teleportation?</p>
    ` : `
      <p>What's the first picture you think of that is between ${renderSmallEmoji(graphics[start])} and ${renderSmallEmoji(graphics[goal])}?</p>
    `;

    const intro = trial.identifyOneState ? msg : `
      <p>Select the ${solution.length-1} picture(s) you would visit to get from ${renderSmallEmoji(graphics[start])}
      to ${renderSmallEmoji(graphics[goal])}. Selected pictures are gray. Only select the pictures you need to navigate through.</p>
    `;
    const graphEl = renderCircleGraph(graph, graphics, goal, stateOrder);
    const timer = `<div class='Timer'></div>`;
    display_element.innerHTML = `${intro}${timer}${graphEl}`;

    // Add styling/classes for selectable states.
    for (const s of graph.states) {
      let cls = 'PathIdentification-selectable';
      if (s == start) {
        cls = 'PathIdentification-start';
      } else if (s == goal) {
        cls = 'PathIdentification-goal';
      }
      const el = display_element.querySelector(`.GraphNavigation-State-${s}`);
      el.classList.add(cls);
    }

    // Start timer
    runTimer(display_element.querySelector('.Timer'), trial.timeLimit);

    const clickLimit = trial.identifyOneState ? 1 : MAX_CLICKS;
    return showPathIdentification(display_element, graph, graphics, start, goal, clickLimit, trial.timeLimit).then(function(data) {
      console.log(data);
      display_element.querySelector('.Timer').remove();
      let msg;
      if (trial.identifyOneState) {
        msg = data.timeout ? '### Ran out of time' : '';
      } else {
        msg = data.success ? `### Success!` : `
        ### Ran out of clicks!
        Sorry, you exceeded the maximum number of ${MAX_CLICKS} clicks.
        `;
      }
      return completeModal(msg).then(function() {
        display_element.innerHTML = '';
        jsPsych.finishTrial(data);
      });
    });
  });

  return plugin;
})();
