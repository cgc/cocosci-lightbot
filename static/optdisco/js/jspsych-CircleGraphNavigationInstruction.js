import {completeModal, addPlugin, graphicsUrl, parseHTML, setTimeoutPromise} from './utils.js';
import {CircleGraph} from './jspsych-CircleGraphNavigation.js';

const renderSmallEmoji = (graphic, style) => `
<span style="display:inline-block;width:3rem;height:3rem;${style || ''}"></span>
`;

addPlugin('CircleGraphNavigationInstruction', async function(root, trial) {
  console.log(trial);

  const {start, goal, graph, graphics, stateOrder} = trial;
  const intermed = 2; // HACK!

  const allKeys = _.unique(_.flatten(trial.graphRenderOptions.successorKeys));

  function edgeShow(state, succ) {
    const valid = new Set([2]);
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

  root.querySelector('.GraphNavigation-edge-0-2').style.opacity = 0;
  root.querySelector('.GraphNavigation-edge-1-2').style.opacity = 0;
  root.querySelector('.GraphNavigation-edge-2-3').style.opacity = 0;

  const goalEl = root.querySelector('.GraphNavigation-goal');
  goalEl.classList.remove('GraphNavigation-goal');

  function makeButtonPromise() {
    return new Promise((resolve, reject) => {
      root.querySelector('button').addEventListener('click', () => resolve());
    });
  }

  function renderKey(key) {
    return `<span
      class="GraphNavigation-key GraphNavigation-key-${key}"
      style="opacity: 1; position: relative; display: inline-block;">${key}</span>`;
  }

  const timeline = [
    {
      pre: () => {},
      html: markdown(`
        Thanks for accepting our HIT! In this HIT, you will play a game
        with these circles.

        <button>Next</button>
      `),
      makePromise: makeButtonPromise,
    },
    {
      pre: () => {
        root.querySelector('.GraphNavigation-edge-0-2').style.opacity = 1;
      },
      html: markdown(`
        Each circle is connected with several other circles, shown by a line between them.
        For example, the two circles below are connected.

        <button>Next</button>
      `),
      makePromise: makeButtonPromise,
    },
    {
      pre: () => {},
      html: markdown(`
        In the first part of this task, you will need to navigate between the circles.
        Your current location is marked with a green circle ${renderSmallEmoji(graphics[start], 'background-color: green;border-radius:100%;')}.

        To navigate between circles, type the letter shown on the line. Now, try it: Type ${renderKey(trial.graphRenderOptions.successorKeys[start][graph.graph[start].indexOf(intermed)])}.
      `),
      makePromise: () => {
        cg.setCurrentState(start);
        return cg.keyTransition();
      },
    },
    {
      pre: () => {
        goalEl.classList.add('GraphNavigation-goal');
        root.querySelector('.GraphNavigation-edge-1-2').style.opacity = 1;
        root.querySelector('.GraphNavigation-edge-2-3').style.opacity = 1;
      },
      html: markdown(`
        Great! Your goal is marked with a red circle ${renderSmallEmoji(graphics[goal], 'background-color: red;border-radius:100%;')}. Try going there now.

        Press the ${allKeys.map(renderKey).join(', ')} keys to navigate.
      `),
      makePromise: () => {
        cg.setCurrentState(intermed);
        return cg.navigate();
      },
    },
    {
      pre: async () => {
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
        The task will consist of ${trial.trialsLength} puzzles with the connections shown below. The connections will be displayed at all times. After you complete the puzzles, we'll ask you some questions.
        Before starting the task, feel free to explore with the ${allKeys.map(renderKey).join(', ')} keys.

        Whenever you're ready: <button>Start the task</button>
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
