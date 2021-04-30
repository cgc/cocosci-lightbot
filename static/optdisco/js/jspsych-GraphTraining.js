import {completeModal, trialErrorHandling, graphicsUrl} from './utils.js';
import {bfs} from './graphs.js';

const stateTemplate = (state, graphic) => `
<div class='State' data-state="${state}"><img src="${graphicsUrl(graphic)}" /></div>
`;

function render(graph, gfx, state, goal) {
  let succ = '';
  let successors = graph.successors(state);
  successors = jsPsych.randomization.repeat(successors, 1);
  for (const s of successors) {
    succ += stateTemplate(s, gfx[s])
  }
  return `
  <div class="GraphTraining">
    <div class="GraphTraining-state">
      <div>Current state: ${stateTemplate(state, gfx[state])}</div>
      <div class="GraphTraining-stateGoal">Goal: ${stateTemplate(goal, gfx[goal])}</div>
    </div>
    Transitions:
    <div class="GraphTraining-successors">
      ${succ}
    </div>
  </div>
  `;
}

function showState(el, graph, graphics, start, goal) {
  let resolve;
  let promise = new Promise(function(res, rej) {
    resolve = res;
  });

  el.innerHTML = render(graph, graphics, start, goal);

  for (const s of el.querySelector('.GraphTraining-successors').querySelectorAll('.State')) {
    s.addEventListener('click', function(e) {
      e.preventDefault(); // HACK
      const state = parseInt(s.getAttribute('data-state'), 10);
      resolve(state);
    });
  }

  return promise;
}

jsPsych.plugins.GraphTraining = (function() {

  var plugin = {};
  plugin.info = {
    name: 'GraphTraining',
    parameters: {}
  };

  plugin.trial = trialErrorHandling(async function(display_element, trial) {
    console.log(trial);

    const startTime = Date.now();
    const data = {
      times: [],
    };
    /*
    TODO record successor orderings?
    record images used
    */

    function recursiveShowState(el, graph, graphics, start, goal) {
      return showState(el, graph, graphics, start, goal).then(function(state) {
        data.times.push(Date.now() - startTime);
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
