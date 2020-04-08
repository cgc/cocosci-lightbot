import {completeModal, SetIsEqual, trialErrorHandling, graphicsUrl} from './utils.js';
import {bfs} from './graphs.js';

const stateTemplate = (state, graphic, cls) => `
<div class="State ${cls}" data-state="${state}"><img src="${graphicsUrl(graphic)}" /></div>
`;

function render(graph, gfx, state, goal) {
  let states = '';
  const ss = jsPsych.randomization.repeat(graph.states, 1);
  for (const s of ss) {
    let cls = 'PathIdentification-selectable';
    if (s == state) {
      cls = 'PathIdentification-start';
    } else if (s == goal) {
      cls = 'PathIdentification-goal';
    }
    states += stateTemplate(s, gfx[s], cls);
  }
  return `
  <div class="PathIdentification">
    How would you get from ${gfx[state]} to ${gfx[goal]}?
    <div class="PathIdentification-states">
    ${states}
    </div>
  </div>
  `;
}

const MAX_CLICKS = 15; // should be tuned per graph???

function showState(el, graph, graphics, start, goal) {
  let resolve;
  let promise = new Promise(function(res, rej) {
    resolve = res;
  });

  const startTime = Date.now();

  const solution = new Set(bfs(graph, start, goal).path);
  solution.delete(start);
  solution.delete(goal);

  el.innerHTML = render(graph, graphics, start, goal);
  const selected = new Set([]);

  const data = {
    selected,
    totalClicks: 0,
    times: [],
    actions: [],
  };

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

      console.log(solution, selected, SetIsEqual(solution, selected));
      // Check to see if they solved it
      if (SetIsEqual(solution, selected)) {
        data.success = true;
        resolve(data);
        return;
      }

      // Check to see if they exceeded # of clicks.
      data.totalClicks++;
      if (data.totalClicks >= 15) {
        data.success = false;
        resolve(data);
        return;
      }
    });
  }

  return promise;
}

jsPsych.plugins.PathIdentification = (function() {

  var plugin = {};
  plugin.info = {
    name: 'PathIdentification',
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

    return showState(display_element, trial.graph, trial.graphics, trial.start, trial.goal).then(function(result) {
      console.log(result);
      let msg;
      if (result.success) {
        msg = `
        ### Success!
        `;
      } else {
        msg = `
        ### Ran out of clicks!
        `;
      }
      return completeModal(msg);
    }).then(function() {
      display_element.innerHTML = ''; // HACK???
      jsPsych.finishTrial(data);
    });
  });

  return plugin;
})();
