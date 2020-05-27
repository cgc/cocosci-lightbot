import {completeModal, trialErrorHandling, graphicsUrl} from './utils.js';
import {bfs} from './graphs.js';

const stateTemplate = (state, graphic, cls, style) => `
<div class="State GraphNavigation-State ${cls || ''}" style="${style || ''}" data-state="${state}"><img src="${graphicsUrl(graphic)}" /></div>
`;

const SUCCESSOR_KEYS = ['J', 'K', 'L'];

function render(graph, gfx, goal) {
  const width = 600;
  const height = 600;
  const blockSize = 100;
  const radiusY = 250;
  const radiusX = 250;

  const stateToXY = {};

  // HACK HACK save this somewhere!!!
  // HACK HACK save this somewhere!!!
  // HACK HACK save this somewhere!!!
  const stateOrder = jsPsych.randomization.repeat(graph.states, 1);

  stateOrder.forEach((state, idx) => {
    const angle = idx * 2 * Math.PI / graph.states.length;
    const offsetX = width / 2 - blockSize / 2;
    const offsetY = height / 2 - blockSize / 2;
    let x = Math.cos(angle) * radiusX + offsetX;
    let y = Math.sin(angle) * radiusY + offsetX;
    stateToXY[state] = [x, y];
  });

  const states = stateOrder.map(state => {
    const [x, y] = stateToXY[state];
    const cls = `GraphNavigation-State-${state} ${state == goal ? 'GraphNavigation-goal' : ''}`;
    return stateTemplate(state, gfx[state], cls, `transform: translate(${x}px,${y}px);`);
  });

  function addKey(key, state, successor, norm) {
    const [x, y] = stateToXY[state];
    const [sx, sy] = stateToXY[successor];
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
    let [x, y] = stateToXY[state];

    graph.graph[state].forEach((successor, idx) => {
      if (state >= successor) {
        return;
      }
      let [sx, sy] = stateToXY[successor];
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

function setCurrentState(display_element, graph, state) {
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

function showState(el, graph, graphics, state, goal) {
  let resolve;
  let promise = new Promise(function(res, rej) {
    resolve = res;
  });

  const keyToState = setCurrentState(el, graph, state);

  function handleTransition(e) {
    e.preventDefault();
    if (e.keyCode in keyToState) {
      document.removeEventListener('keypress', handleTransition);
      resolve(keyToState[e.keyCode]);
    }
  }
  document.addEventListener('keypress', handleTransition);

  return promise;
}

jsPsych.plugins.GraphNavigation = (function() {

  var plugin = {};
  plugin.info = {
    name: 'GraphNavigation',
    parameters: {}
  };

  plugin.trial = trialErrorHandling(async function(display_element, trial) {
    console.log(trial);

    const startTime = Date.now();
    const data = {
      times: [],
      states: [],
      hovers: [],
    };
    let hovers = [];
    /*
    TODO record successor orderings?
    record images used
    */

    display_element.innerHTML = render(trial.graph, trial.graphics, trial.goal);

    for (const el of display_element.querySelectorAll('.GraphNavigation-State')) {
      el.addEventListener('mouseenter', function(e) {
        const state = parseInt(el.dataset.state, 10);
        hovers.push({state, time: Date.now() - startTime});

        for (const edge of display_element.querySelectorAll('.GraphNavigation-edge')) {
          edge.classList.add('is-faded');
        }
        for (const successor of trial.graph.graph[state]) {
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

    function recursiveShowState(el, graph, graphics, start, goal) {
      return showState(el, graph, graphics, start, goal).then(function(state) {
        data.times.push(Date.now() - startTime);
        data.states.push(state);
        data.hovers.push(hovers);
        hovers = [];

        if (state === goal) {
          return [goal];
        } else {
          return recursiveShowState(el, graph, graphics, state, goal);
        }
      }).then(function(path) {
        return [start].concat(path);
      });
    }

    return recursiveShowState(display_element, trial.graph, trial.graphics, trial.start, trial.goal).then(function(path) {
      data.states = path;
      console.log(data);
      const optimal = bfs(trial.graph, trial.start, trial.goal);
      return completeModal(`
        ### Success!
        Took ${path.length - 1} moves. Optimal length ${optimal.path.length}.
        ${path.join('')}
      `);
    }).then(function() {
      display_element.innerHTML = ''; // HACK???
      jsPsych.finishTrial(data);
    });
  });

  return plugin;
})();
