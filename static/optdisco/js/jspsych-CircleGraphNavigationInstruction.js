import {completeModal, addPlugin, graphicsUrl, parseHTML} from './utils.js';
import {showState, renderCircleGraph, setCurrentState} from './jspsych-CircleGraphNavigation.js';

const renderSmallEmoji = (graphic, style) => `
<img src="${graphicsUrl(graphic)}" style="width:4rem;height:4rem;${style || ''}" />
`;

addPlugin('CircleGraphNavigationInstruction', async function(root, trial) {
  console.log(trial);

  const {start, goal, graph, graphics, stateOrder} = trial;
  const intermed = 2; // HACK!

  const graphEl = renderCircleGraph(graph, graphics, goal, stateOrder);
  root.innerHTML = `<div class="GraphNavigation-instruction"></div>${graphEl}`;
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

  async function showStateUntil(state, goal) {
    const nextState = await showState(root, graph, state);
    if (nextState == goal) {
      return;
    }
    return showStateUntil(nextState, goal);
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
        with these pictures.

        <button>Next</button>
      `),
      makePromise: makeButtonPromise,
    },
    {
      pre: () => {
        root.querySelector('.GraphNavigation-edge-0-2').style.opacity = 1;
      },
      html: markdown(`
        Each picture is associated with several other pictures, shown by a line between them.
        For example, ${renderSmallEmoji(graphics[start])} is associated with ${renderSmallEmoji(graphics[intermed])}.

        <button>Next</button>
      `),
      makePromise: makeButtonPromise,
    },
    {
      pre: () => {},
      html: markdown(`
        In the first part of this task, you will need to navigate between the pictures.
        Your current location ${renderSmallEmoji(graphics[start])} is marked with a green circle ${renderSmallEmoji(graphics[start], 'background-color: green;border-radius:100%;')}.

        To navigate between places, type the letter shown on the line. Now, try it: Type ${renderKey('J')}.
      `),
      makePromise: () => showState(root, graph, start),
    },
    {
      pre: () => {
        goalEl.classList.add('GraphNavigation-goal');
        root.querySelector('.GraphNavigation-edge-1-2').style.opacity = 1;
        root.querySelector('.GraphNavigation-edge-2-3').style.opacity = 1;
      },
      html: markdown(`
        Great! Your goal ${renderSmallEmoji(graphics[goal])} is marked with a red circle ${renderSmallEmoji(graphics[goal], 'background-color: red;border-radius:100%;')}. Try going there now.

        Press the ${renderKey('J')}, ${renderKey('K')}, and ${renderKey('L')} keys to navigate.
      `),
      makePromise: () => showStateUntil(intermed, goal),
    },
    {
      pre: async () => {
        const setTimeoutPromise = (ms) => new Promise((res) => setTimeout(res, ms));
        const t = 300;

        let el = root.querySelector('.GraphNavigation');
        el.style.transition = `opacity ${t}ms`;
        el.style.opacity = 0;
        await setTimeoutPromise(t);

        el.remove();
        el = parseHTML(renderCircleGraph(trial.fullGraph, graphics, goal, stateOrder));
        root.appendChild(el);
        el.style.opacity = 0;
        await setTimeoutPromise(0);

        el.style.transition = `opacity ${t}ms`;
        el.style.opacity = 1;
      },
      html: markdown(`
        The task will consist of 15 puzzles like this, but with the associations shown below. Click the button below when you are ready to start.
        <button>Continue</button>
      `),
      makePromise: makeButtonPromise,
    },
  ];

  async function recursiveTimeline(idx) {
    idx = idx || 0;
    if (idx == timeline.length) {
      return;
    }

    const t = timeline[idx];
    t.pre();
    instruction.innerHTML = t.html;
    await t.makePromise();
    return recursiveTimeline(idx + 1);
  }

  return recursiveTimeline().then(() => {
    root.innerHTML = '';
    jsPsych.finishTrial();
  });
});
