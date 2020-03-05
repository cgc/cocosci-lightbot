import {Graph} from './graphs.js';
import {graphics} from './utils.js';
import './jspsych-GraphTraining.js';
import './jspsych-PathIdentification.js';

// loading some data...
//import s2c from '../json/solway2c.js';
import s2c from './solway2c.js';

const instructions = () => ({
  type: "html-button-response",
  // We use the handy markdown function (defined in utils.js) to format our text.
  stimulus: markdown(`
  # Instructions
  XXXX

  Thanks for accepting our HIT! In this HIT, you will solve block
  puzzles. There are ${trials.length} puzzles for you to solve.

  On each round, you will see two sets of blocks. There are three places where you
  can build a column of blocks. Your task is to stack the blocks in the left box
  to match the blocks in the right box. The blocks
  in the right box will always be in alphabetical order in the middle column.
  You can only move the top block in each column.

  Here's an example with 3 blocks:

  <img width="355" src="static/images/blockworld.gif" />

  `),
  choices: ['Continue'],
  button_html: '<button class="btn btn-primary">%choice%</button>'
});

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

  let tasks = [];
  const states = graph.states;
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

  const gfx = jsPsych.randomization.sampleWithoutReplacement(graphics, states.length);
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

  var timeline = [
    //instructions,
    gt,
    pi,
    //finalPoints,
    debrief(),
  ];

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
  return saveData().then(function() {
    return delay(500, function() {
      $('#welcome').hide();
      return initializeExperiment().catch(handleError);
    });
  }).catch(function() {
    return $('#data-error').show();
  });
});
