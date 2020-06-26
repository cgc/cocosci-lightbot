import {Graph} from './graphs.js';
import {graphics, graphicsUrl, graphicsLoading} from './utils.js';
import './jspsych-GraphTraining.js';
import './jspsych-CircleGraphNavigation.js';
import './jspsych-CircleGraphNavigationInstruction.js';
import './jspsych-OneStepTraining.js';
import './jspsych-PathIdentification.js';
import '../../lib/jspsych-6.0.1/plugins/jspsych-html-button-response.js';
import config from './configuration/trials.js';
//import s2c from './solway2c.js';

const renderState = (graphic) => `<div class="State">
  <img src="${graphicsUrl(graphic)}" />
</div>`;

const renderSmallEmoji = (graphic) => `
<img src="${graphicsUrl(graphic)}" style="width:6rem;height:6rem;" />
`;

const instructions = (gfx) => (
    [{
      type: "html-button-response",
      // We use the handy markdown function (defined in utils.js) to format our text.
      stimulus: markdown(`
      # Instructions

      Thanks for accepting our HIT! In this HIT, you will play a game
      with these pictures:

      <div>
      ${_(_.shuffle(graphics)).chunk(8).map((c) => c.map(renderSmallEmoji).join("")).join("<br>")}
      </div>

      Each picture is associated with several other pictures. For example, this picture

      <div>${renderSmallEmoji("🍫")}</div>

      might be associated with these three pictures:

      <div>${renderSmallEmoji("🔮")}${renderSmallEmoji("🐳")}${renderSmallEmoji("🎁")}</div>
      `),
      choices: ['Continue'],
      button_html: '<button id="continuebutton" class="btn btn-primary">%choice%</button>',
      on_load: function (trial) {
        document.getElementById("continuebutton").style.display = "none";
        setTimeout(() => {document.getElementById("continuebutton").style.display = "block";}, 3000)
      }
    },
    {
      type: "html-button-response",
      stimulus: markdown(`
      # Instructions

      In the first part of this task, you will need to learn the
      associations between the different pictures.

      <div>${renderSmallEmoji("⚙️")}${renderSmallEmoji("⚙️")}${renderSmallEmoji("⚙️")}</div>

      You will be given a series of **learning trials**.
      On each trial, you will be shown one picture and
      will need to identify its associations out of several
      other pictures.

      <div>${renderSmallEmoji("🚲")}${renderSmallEmoji("🚲")}${renderSmallEmoji("🚲")}</div>

      Whenever you make a mistake, you will be shown the answers in
      <span style="color: greenyellow; background-color: darkgrey">green</span>.
      Don't be surprised if you make a lot of mistakes at first!

      <div>${renderSmallEmoji("🐒")}${renderSmallEmoji("🐒")}${renderSmallEmoji("🐒")}</div>

      The learning trials will get progressively harder.
      Once you are able to correctly identify **every** association
      **without making a mistake** on the hardest trials, you can continue
      to the main part of the task.
      `),
      choices: ['Continue'],
      button_html: '<button id="continuebutton" class="btn btn-primary">%choice%</button>',
      on_load: function (trial) {
        document.getElementById("continuebutton").style.display = "none";
        setTimeout(() => {document.getElementById("continuebutton").style.display = "block";}, 3000)
      }
    }]
);

const debrief = () => [{
  type: 'survey-multi-choice',
  preamble: markdown(`
  # HIT complete

  Thanks for participating! Please answer the questions below before
  submitting the HIT.
  `),
  button_label: 'Submit',
  questions: [
    {prompt: "Which hand do you use to write?", name: 'hand', options: ['Left', 'Right', 'Either'], required:true},
  ],
}, {
  type: 'survey-text',
  preamble: markdown(`
  # HIT complete

  Thanks for participating! Please answer the questions below before
  submitting the HIT.
  `),
  button_label: 'Submit',
  questions: [
    {'prompt': 'What strategy did you use to answer the questions?',
     'rows': 2, columns: 60},
//    {'prompt': 'How did you make the decision about which picture to use for instant teleportation?',
//     'rows': 2, columns: 60},
    {'prompt': 'Was anything confusing or hard to understand?',
     'rows': 2, columns: 60},
    {'prompt': 'Do you have any suggestions on how we can improve the instructions or interface?',
     'rows': 2, columns: 60},
    {'prompt': 'Any other comments?',
     'rows': 2, columns: 60}
  ]
}];

const piInstruction = () => ({
  type: "html-button-response",
  // We use the handy markdown function (defined in utils.js) to format our text.
  stimulus: markdown(`
    In this next section we'll ask you a few questions about how you navigate.

    First, we'll ask you to tell us how you would navigate between two pictures by selecting the pictures you would pass through. Make sure you've only selected the relevant pictures. There is a limit of 15 clicks before you move on to the next question.
  `),
  choices: ['Continue'],
  button_html: '<button class="btn btn-primary">%choice%</button>',
});

const piInstruction2 = () => ({
  type: "html-button-response",
  // We use the handy markdown function (defined in utils.js) to format our text.
  stimulus: markdown(`
    Now, we'll ask you to tell us just one picture you'll navigate through.
  `),
  choices: ['Continue'],
  button_html: '<button class="btn btn-primary">%choice%</button>',
});

const makeSimpleInstruction = (text) => ({
  type: "html-button-response",
  // We use the handy markdown function (defined in utils.js) to format our text.
  stimulus: markdown(text),
  choices: ['Continue'],
  button_html: '<button class="btn btn-primary">%choice%</button>',
});

function makeUpdateProgress(total) {
  var i = 0;
  return function() {
    i += 1;
    jsPsych.setProgressBar(i/total);
  };
}

/*
x,y coordinates for the solway graph from Figure 2c.
*/
const solway2cXY = [
  [0, 5],
  [2, 5],
  [1, 4],
  [0, 3],
  [2, 3],
  [3, 2],
  [5, 2],
  [4, 1],
  [3, 0],
  [5, 0],
].map(xy => {
  // Mapping to [-1, 1], divide by max 5, mult by length of range.
  let scale = 2/5;
  let x = (xy[0]*scale - 1);
  let y = -(xy[1]*scale - 1);
  [x, y] = [(x + y) / Math.sqrt(2), (y - x) / Math.sqrt(2)];
  const scaleFactor = 0.97;
  return [scaleFactor*x, scaleFactor*y];
});

async function initializeExperiment() {
  psiturk.recordUnstructuredData('browser', window.navigator.userAgent);

  const stateOrderIdx = _.random(config.stateOrders.length-1);
  psiturk.recordUnstructuredData('stateOrderIdx', stateOrderIdx);

  const taskOrderIdx = _.random(config.taskOrders.length-1);
  psiturk.recordUnstructuredData('taskOrderIdx', taskOrderIdx);

  //const timeLimit = _.sample([4*1000, 8*1000, 12*1000]);
  //psiturk.recordUnstructuredData('timeLimit', timeLimit);

  const acceptRejectKeys = _.sample([
    {accept: 'P', reject: 'Q'},
    {accept: 'Q', reject: 'P'},
  ]);
  psiturk.recordUnstructuredData('acceptRejectKeys', acceptRejectKeys);

  const graph = new Graph(config.graph);
  // HACK how to systematically implement this?
  // graph.shuffleSuccessors();

  const graphRenderOptions = {
    fixedXY: solway2cXY,
    keyDistanceFactor: 1.35,
    scaleEdgeFactor: 1,
    width: 800,
    height: 400,
  };

  const trials = (
    config.taskOrders[taskOrderIdx]
    // HACK this filters for tasks that cross bottlenecks & are longer than 2 steps.
    .filter(t => ((t.start<5)^(t.goal<5)) && t.optimal > 2)
    // PRETRIAL
    .slice(0, 30));
  psiturk.recordUnstructuredData('trials', trials);
  const stateOrder = config.stateOrders[stateOrderIdx];
  const gfx = jsPsych.randomization.sampleWithoutReplacement(graphics, graph.states.length);
  psiturk.recordUnstructuredData('gfx', gfx);

  const instructionNodes = {
    0: new Set([2]),
    2: new Set([0, 1, 3]),
  };
  const instructionGraph = new Graph(config.graph.map(node => {
    const ns = instructionNodes[node[0]];
    return [
      node[0],
      ns ? node[1].filter(n => ns.has(n)) : [],
    ];
  }));

  var inst = {
    type: 'CircleGraphNavigationInstruction',
    graph: instructionGraph,
    fullGraph: graph,
    graphics: gfx,
    trialsLength: trials.length,
    stateOrder,
    timeline: [{start: 0, goal: 1}],
    graphRenderOptions,
    on_finish() {
      updateProgress();
      saveData();
    }
  };

  var gn = {
    type: 'CircleGraphNavigation',
    graph,
    graphics: gfx,
    stateOrder,
    timeline: trials,
    graphRenderOptions,
    on_finish() {
      updateProgress();
      saveData();
    }
  };

  var piInstruction = makeSimpleInstruction(`
    In this next section, we want to understand how you are planning your
    routes. For the next ${config.probes.length} rounds, we will show you a
    picture to start at and one to navigate to, just like before.

    But, instead of actually navigating from one to the other, we just want you to<br>
    **start planning your route and click on the *first picture that comes to mind.***

    First we'll start with some practice questions.
  `);

  var piCheck = {
    type: 'survey-multi-choice',
    preamble: `
      <h1>Comprehension check</h1>

    `,
      // Please answer the following question to ensure you understand.
    questions: [
      {
        prompt: 'For the next rounds, which picture should you click on?',
        options: [
          '&nbsp;The prettiest picture.',
          '&nbsp;<i>Any</i> picture on the path between the start and goal state.',
          '&nbsp;The <i>first</i> picture on the path between the start and goal state.',
          '&nbsp;The first picture that comes to mind when planning a route from start to goal state.'
        ],
        required: true
      }

    ]
  }

  var pi = (timeline) => ({
    type: 'CirclePathIdentification',
    graph,
    graphics: gfx,
    stateOrder,
    timeline,
    //timeLimit: timeLimit,
    identifyOneState: true,
    graphRenderOptions,
    on_finish() {
      updateProgress();
      saveData();
    }
  });

  function renderKey(key) {
    return `<span
      class="GraphNavigation-key GraphNavigation-key-${key}"
      style="opacity: 1; position: relative; display: inline-block;">${key}</span>`;
  }
  var arInstruction = makeSimpleInstruction(`
    In this last section we will ask you ${config.acceptreject.length} questions about how you navigate.

    We'll show you a start picture and goal picture and ask if a third picture is along the route between them. You'll use the keyboard to respond by pressing ${renderKey(acceptRejectKeys.accept)} for <b>Yes</b> and ${renderKey(acceptRejectKeys.reject)} for <b>No</b>.

    First we'll start with some practice questions.
  `);

  const practiceOver = makeSimpleInstruction(`
    Now, we'll move on to the real questions.
  `);

  var ar = timeline => ({
    type: 'AcceptReject',
    acceptRejectKeys,
    graph,
    graphics: gfx,
    stateOrder,
    timeline,
    graphRenderOptions,
    on_finish() {
      updateProgress();
      saveData();
    }
  });

  const busInstruction = makeSimpleInstruction(`
    While solving these ${trials.length} puzzles, keep in mind the following question which will be asked later:

    > Imagine a version of this task that includes instant teleportation to one picture of your choice. The task is otherwise exactly the same: you navigate between the same pictures along the same connections, but you can also teleport to the picture you choose.
    >
    > If you did the task again, which picture would you choose to use for instant teleportation?
  `);

  let updateProgress = makeUpdateProgress(trials.length + config.probes.length + config.acceptreject.length);

  var timeline = _.flatten([
    inst,
    busInstruction,
    gn,
    makeSimpleInstruction(`You've completed the ${trials.length} puzzles! Now we'll ask you some questions.`),
    pi([{identifyOneState: true, busStop: true}]),
    piInstruction,
    piCheck,
    pi([
      {start: 0, goal: 4, practice: true},
      {start: 5, goal: 9, practice: true},
    ]),
    practiceOver,
    pi(config.probes),
    arInstruction,
    ar([
      {start: 0, goal: 4, probe: 1, practice: true},
      {start: 5, goal: 9, probe: 8, practice: true},
    ]),
    practiceOver,
    ar(config.acceptreject),
    debrief(),
  ]);

  if (location.pathname == '/testexperiment') {
    const searchParams = new URLSearchParams(location.search);
    const type = searchParams.get('type');
    if (type) {
      timeline = timeline.filter(t => t.type == type);
    } else {
      timeline = timeline.map(t => ({...t, timeline: t.timeline ? t.timeline.slice(0, 1) : [{}]}));
    }
  }

  return startExperiment({
    timeline,
    show_progress_bar: true,
    auto_update_progress_bar: false,
    auto_preload: false,
    exclusions: {
      // min_width: 800,
      // min_height: 600
    },
  });
}

$(window).on('load', function() {
  return Promise.all([graphicsLoading, saveData()]).then(function() {
    $('#welcome').hide();
    return initializeExperiment().catch(handleError);
  }).catch(function() {
    return $('#data-error').show();
  });
});

const errors = [];
function recordError(e) {
  if (!e) {
    // Sometimes window.onerror passes in empty errors?
    return;
  }
  errors.push(e);
  psiturk.recordUnstructuredData('error2', JSON.stringify(errors.map(function(e) {
    return e.message + e.stack;
  })));
  psiturk.saveData();
}
window.onerror = function(message, source, lineno, colno, error) {
  recordError(error);
};
window.addEventListener('unhandledrejection', function(event) {
  recordError(event.reason);
});
