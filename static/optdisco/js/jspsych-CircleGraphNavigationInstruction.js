import {bfs} from './graphs.js';
import {markdown, addPlugin} from './utils.js';
import {queryEdge, CircleGraph, renderSmallEmoji} from './jspsych-CircleGraphNavigation.js';
import _ from '../../lib/underscore-min.js';
import jsPsych from '../../lib/jspsych-exported.js';

addPlugin('CircleGraphNavigationInstruction', async function(root, trial) {
  console.log(trial);

  const {start, goal, graph, graphics} = trial;
  const intermed = bfs(graph, start, goal).path[1]; // Sort of a hack?

  const allKeys = _.unique(_.flatten(trial.graphRenderOptions.successorKeys)).sort();

  function edgeShow(state, succ) {
    //const valid = new Set([2]); this right??
    const valid = new Set([intermed]);
    return valid.has(state) || valid.has(succ);
  }

  const cg = new CircleGraph({
    ...trial,
    start: null,
    edgeShow,
  });
  root.innerHTML = `<div class="GraphNavigation-instruction"></div>`;//`${graphEl}`;
  root.appendChild(cg.el);
  const instruction = root.querySelector('.GraphNavigation-instruction');

  for (const successor of graph.successors(intermed)) {
    queryEdge(cg.el, intermed, successor).style.opacity = 0;
  }

  const goalEl = cg.el.querySelector('.GraphNavigation-goal');
  goalEl.classList.remove('GraphNavigation-goal');

  function makeButtonPromise() {
    return new Promise((resolve, reject) => {
      root.querySelector('button').addEventListener('click', () => resolve());
    });
  }

  function renderKey(key) {
    return `<span
      class="GraphNavigation-key GraphNavigation-key-${key.charCodeAt(0)}"
      style="opacity: 1; position: relative; display: inline-block;">${key}</span>`;
  }

  const timeline = [
    {
      pre: () => {},
      html: markdown(`
        Thanks for accepting our experiment! In this experiment, you will play a game
        with these pictures.

        <button>Next</button>
      `),
      makePromise: makeButtonPromise,
    },
    {
      pre: () => {
        queryEdge(cg.el, start, intermed).style.opacity = 1;
      },
      html: markdown(`
        Each picture is connected with several other pictures, shown by a line between them.
        For example, the two pictures below are connected.

        <button>Next</button>
      `),
      makePromise: makeButtonPromise,
    },
    {
      pre: () => {},
      html: markdown(`
        Your current location is marked green ${renderSmallEmoji(graphics[start], 'GraphNavigation-current')}. You can move to different locations by typing the number shown on the line. Try it now.
      `),
      makePromise: () => {
        cg.setCurrentState(start);
        return cg.keyTransition();
      },
    },
    {
      pre: () => {
        goalEl.classList.add('GraphNavigation-goal');
        for (const successor of graph.successors(intermed)) {
          queryEdge(cg.el, intermed, successor).style.opacity = 1;
        }
      },
      html: markdown(`
        Great! Your goal is marked yellow ${renderSmallEmoji(graphics[goal], 'GraphNavigation-goal')}. Try going there now.

        Press the ${allKeys.map(renderKey).join(', ')} keys to navigate.
      `),
      makePromise: () => {
        cg.setCurrentState(intermed);
        return cg.navigate();
      },
    },
    {
      pre: async () => {
        // Remove height limit from instructions for this last step.
        instruction.classList.remove('GraphNavigation-instruction');
        instruction.style.textAlign = 'left';
        // Remove goal
        cg.options.goal = null;
        cg.el.querySelector('.GraphNavigation-goal').classList.remove('GraphNavigation-goal');
        // Show all edges
        cg.options.edgeShow = () => true;
        Array.from(cg.el.querySelectorAll('.GraphNavigation-edge')).forEach(el => { el.style.opacity = 1; });
        // Transition to goal (from last step)
        cg.setCurrentState(goal);
        // Free-form navigation!
        cg.navigate().catch(err => {
          // Cancellation causes an error, so we ignore it.
          if (err.name != 'PromiseCancellation') {
            throw err;
          }
        });
      },
      html: markdown(`
        This experiment will consist of navigation puzzles and questions using the connections below.
        - During navigation puzzles, **${trial.onlyShowCurrentEdges ? 'the connections will only be displayed for your current location' : 'the connections will be displayed at all times'}**.
        - Afterwards, we’ll hide the connections and ask you some questions.
        - Throughout the experiment, you’ll periodically see a map that shows all the connections, making it easier to see how the locations are laid out.

        Please take a moment to explore with the ${allKeys.map(renderKey).join(', ')} keys.

        Whenever you're ready: <button>Continue</button>
      `),
      makePromise: makeButtonPromise,
    },
  ];

  for (const t of timeline) {
    t.pre();
    instruction.innerHTML = t.html;
    await t.makePromise();
  }

  // Cancel the free-form navigation that we started above.
  cg.cancel();

  root.innerHTML = '';
  jsPsych.finishTrial();
});
