import {Graph} from './graphs.js';
import {graphics, graphicsUrl, graphicsLoading} from './utils.js';
import './jspsych-GraphTraining.js';
import './jspsych-OneStepTraining.js';
import './jspsych-PathIdentification.js';
import '../../lib/jspsych-6.0.1/plugins/jspsych-html-button-response.js';

// loading some data...
//import s2c from '../json/solway2c.js';
import s2c from './solway2c.js';

const renderState = (graphic) => `<span class="State">
  <img src="${graphicsUrl(graphic)}" />
</span>`;

const renderSmallEmoji = (graphic) => `
<img src="${graphicsUrl(graphic)}" style="width:5rem;height:5rem;" />
`;

const instructions = () => (
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

      <div>${renderState("🍫")}</div>

      might be associated with these three pictures:

      <div>${renderState("🔮")}${renderState("🐳")}${renderState("🎁")}</div>
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

const debrief = () => ({
  type: 'survey-text',
  preamble: markdown(`
  # HIT complete

  Thanks for participating! Please answer the questions below before
  submitting the HIT.
  `),
  button_label: 'Submit',
  questions: [
    {'prompt': 'Was anything confusing or hard to understand?',
     'rows': 2, columns: 60},
    {'prompt': 'Do you have any suggestions on how we can improve the instructions or interface?',
     'rows': 2, columns: 60},
    {'prompt': 'Any other comments?',
     'rows': 2, columns: 60}
  ]
});


function makeUpdateProgress(total) {
  var i = 0;
  return function() {
    i += 1;
    jsPsych.setProgressBar(i/total);
  };
}

async function initializeExperiment() {
  // Saving some subject metadata
  psiturk.recordUnstructuredData('browser', window.navigator.userAgent);

  const graph = new Graph(s2c);
  window.graph = graph;
  const states = graph.states;
  const gfx = jsPsych.randomization.sampleWithoutReplacement(graphics, states.length);
  // let updateProgress = makeUpdateProgress(trials.length + numSampledTasks);
  var onestep_2d = {
    type: 'OneStepTraining',
    graph: graph,
    graphics: gfx,
    trainingParams: {
      nDistractors: 2,
      peekable: false,
      strategy: "spacedrep" //"allstates"
    },
    timeline: [{start: 0, goal: 1}, ],
    on_finish() {
      // updateProgress();
      saveData();
    }
  };

  var onestep_5d = {
    type: 'OneStepTraining',
    graph: graph,
    graphics: gfx,
    trainingParams: {
      nDistractors: 5,
      peekable: false,
      strategy: "spacedrep"
    },
    on_finish() {
      // updateProgress();
      saveData();
    }
  };

  //main task
  let tasks = [];
  // const states = graph.states;
  for (const start of states) {
    for (const goal of states) {
      if (start === goal) {
        continue;
      }
      tasks.push({start, goal});
    }
  }
  const numSampledTasks = 2;
  tasks = jsPsych.randomization.sampleWithoutReplacement(tasks, numSampledTasks);

  let trials = [
    {start: 0, goal: 1},
    {start: 0, goal: 4},
    {start: 0, goal: 5},
    ...tasks,
  ];

  let updateProgress = makeUpdateProgress(trials.length + numSampledTasks);

  // const gfx = jsPsych.randomization.sampleWithoutReplacement(graphics, states.length);
  var gt = {
    type: 'GraphTraining',
    graph: graph,
    graphics: gfx,
    timeline: trials,
    on_finish() {
      updateProgress();
      saveData();
    }
  };

  var pi = {
    type: 'PathIdentification',
    graph: graph,
    graphics: gfx,
    timeline: tasks,
    on_finish() {
      updateProgress();
      saveData();
    }
  };

  var timeline = _.flatten([
    instructions(),
    onestep_2d,
    onestep_5d,
    // gt,
    // pi,
    // finalPoints,
    debrief(),
  ]);

  if (location.pathname == '/testexperiment') {
    const searchParams = new URLSearchParams(location.search);
    // HACK Demo logic here!
    timeline = [
      {
        type: searchParams.type || 'GraphTraining',
        graph: graph,
        graphics: gfx,
        timeline: trials,
        on_finish() {
          updateProgress();
        }
      },
    ];
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
