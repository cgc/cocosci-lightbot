import {Graph, bestKeys, clockwiseKeys} from './graphs.js';
import {graphics, graphicsUrl, graphicsLoading} from './utils.js';
import {renderSmallEmoji} from './jspsych-CircleGraphNavigation.js';
import './jspsych-CircleGraphNavigationInstruction.js';
import '../../lib/jspsych-6.0.1/plugins/jspsych-html-button-response.js';
import config from './configuration/trials.js';

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
    {prompt: "In general, do you consider yourself detail-oriented or a big picture thinker?", name: 'detail-big-picture', options: ['Detail-Oriented', 'Big Picture Thinker', 'Both', 'Neither'], required:true},
    {prompt: "Did you take a picture of the map? If you did, how often did you have to look at it? Note: Your completed HIT will be accepted regardless of your answer to this question.", name: 'picture-map', options: ['Did not take picture', 'Rarely looked at picture', 'Sometimes looked at picture', 'Often looked at picture'], required:true},
    {prompt: "Did you draw the map out? If you did, how often did you have to look at it? Note: Your completed HIT will be accepted regardless of your answer to this question.", name: 'draw-map', options: ['Did not draw map', 'Rarely looked', 'Sometimes looked', 'Often looked'], required:true},
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
    {'prompt': 'What strategy did you use to navigate?',
     'rows': 2, columns: 60},
    {'prompt': 'Was anything confusing or hard to understand?',
     'rows': 2, columns: 60},
    {'prompt': 'Do you have any suggestions on how we can improve the instructions or interface?',
     'rows': 2, columns: 60},
    {'prompt': 'Any other comments?',
     'rows': 2, columns: 60}
  ]
}];

const makeSimpleInstruction = (text) => ({
  type: "SimpleInstruction",
  stimulus: markdown(text),
});

function makeUpdateProgress(total) {
  var i = 0;
  return function() {
    i += 1;
    jsPsych.setProgressBar(i/total);
  };
}

function toNewKey(key) {
  return {
    I: String.fromCharCode(38), // Up
    J: String.fromCharCode(37), // Left
    K: String.fromCharCode(40), // Down
    L: String.fromCharCode(39), // Right
  }[key];
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

// This mapping corresponds to the planarization specified by solway2cXY
const solway2cKeys = [
  ['I', 'L', 'K'],
  ['J', 'K', 'L'],
  ['J', 'I', 'K'],
  ['J', 'I', 'L'],
  ['I', 'K', 'L'],
  ['J', 'I', 'K'],
  ['J', 'K', 'L'],
  ['I', 'K', 'L'],
  ['J', 'I', 'L'],
  ['I', 'J', 'K'],
];

async function initializeExperiment() {
  psiturk.recordUnstructuredData('browser', window.navigator.userAgent);

  const onlyShowCurrentEdges = true;

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
  const stateOrder = config.stateOrders[stateOrderIdx];

  const graphRenderOptions = {
    onlyShowCurrentEdges,
    /* Good parameters for no-picture.
    scaleEdgeFactor: 1,
    width: 450,
    height: 450,
    radiusX: 175,
    radiusY: 175,
    successorKeys: bestKeys(graph, stateOrder),
    */
    // Parameters with picture.
    width: 500,
    height: 500,
    radiusX: 210,
    radiusY: 210,
    /*
    successorKeysRender: (key) => ({
      37: "\u2190", 38: "\u2191",
      39: "\u2192", 40: "\u2193",
    }[key.charCodeAt(0)]),
    successorKeys: bestKeys(graph, stateOrder).map(keys => keys.map(key => toNewKey(key))),
    */
    successorKeys: clockwiseKeys(graph, stateOrder),
  };
  const planarOptions = {
    // For Solway planarization.
    fixedXY: solway2cXY,
    keyDistanceFactor: 1.35,
    scaleEdgeFactor: 1,
    width: 800,
    height: 400,
  };

  let length3 = 0;
  const trials = config.taskOrders[taskOrderIdx].filter((t, idx) => {
    const cross = (t.start<5)^(t.goal<5);
    if (cross) {
      if (t.optimal > 3) {
        return true;
      } else if (t.optimal == 3) {
        length3++;
        if (length3 <= 6) {
          return true;
        }
      }
    }
    return false;
  });
  /*
  const trials = (
    config.taskOrders[taskOrderIdx]
    // HACK this filters for tasks that cross bottlenecks & are longer than 2 steps.
    .filter(t => ((t.start<5)^(t.goal<5)) && t.optimal > 2)
    // PRETRIAL
    .slice(0, 30));
    */
  psiturk.recordUnstructuredData('trials', trials);
  const gfx = jsPsych.randomization.sampleWithoutReplacement(graphics, graph.states.length);
  psiturk.recordUnstructuredData('gfx', gfx);

  var inst = {
    type: 'CircleGraphNavigationInstruction',
    graph,
    graphics: gfx,
    trialsLength: trials.length,
    stateOrder,
    timeline: [{start: 0, goal: 1}],
    graphRenderOptions: {...graphRenderOptions, onlyShowCurrentEdges: false},
    onlyShowCurrentEdges,
    on_finish() {
      updateProgress();
      saveData();
    }
  };

  var cgt = {
    type: 'CGTransition',
    graph,
    graphics: gfx,
    stateOrder,
    timeline: config.transitionOrders,
    graphRenderOptions,
  };

  function addShowMap(trials) {
    /*
    For now, we show the map every other trial.
    */
    return trials.map((t, idx) => ({showMap: (idx % 2) == 0, ...t}));
  }

  var gn = (trials) => ({
    type: 'CircleGraphNavigation',
    graph,
    graphics: gfx,
    stateOrder,
    timeline: addShowMap(trials),
    graphRenderOptions,
    planarOptions,
    on_finish() {
      updateProgress();
      saveData();
    }
  });

  var piInstruction = makeSimpleInstruction(`
    In this next section, we want to understand how you are planning your
    routes. For the next ${config.probes.length} rounds, we will show you a
    circle to start at and one to navigate to, just like before.

    But, instead of actually navigating from one to the other, we just want you to<br>
    **start planning your route and click on the *first circle that comes to mind.***

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
        prompt: 'For the next rounds, which circle should you click on?',
        options: [
          '&nbsp;The prettiest circle.',
          '&nbsp;<i>Any</i> circle on the path between the start and goal.',
          '&nbsp;The <i>first</i> circle on the path between the start and goal.',
          '&nbsp;The first circle that comes to mind when planning a route from start to goal.'
        ],
        required: true
      }

    ]
  }

  var pi = (copy, timeline) => ({
    type: 'CirclePathIdentification',
    copy,
    graph,
    graphics: gfx,
    stateOrder,
    timeline: addShowMap(timeline),
    //timeLimit: timeLimit,
    identifyOneState: true,
    graphRenderOptions: {...graphRenderOptions, edgeShow: () => false},
    planarOptions,
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
    In the next set of trials, we'll show you a start and goal and ask if a location is along the route between them. You'll use the keyboard to respond by pressing ${renderKey(acceptRejectKeys.accept)} for <b>Yes</b> and ${renderKey(acceptRejectKeys.reject)} for <b>No</b>.

    First we'll just practice using P and Q keys to answer Yes/No questions.
  `);

  const practiceOver = makeSimpleInstruction(`
    Now, we'll move on to the real questions.
  `);

  const expectedResponses = _.shuffle(new Array(3).fill('Q').concat(new Array(3).fill('P'))).map(er => ({expectedResponse: er}));
  var arKeyPractice = {
    type: 'AcceptRejectPractice',
    acceptRejectKeys,
    timeline: expectedResponses,
  };

  var ar = timeline => ({
    type: 'AcceptReject',
    acceptRejectKeys,
    graph,
    graphics: gfx,
    stateOrder,
    timeline: addShowMap(timeline),
    graphRenderOptions: {...graphRenderOptions, edgeShow: () => false},
    planarOptions,
    on_finish() {
      updateProgress();
      saveData();
    }
  });

  const busInstruction = makeSimpleInstruction(`
    While solving these ${trials.length} puzzles, keep in mind the following question which will be asked later:

    > Imagine a version of this task that includes instant teleportation to one circle of your choice. The task is otherwise exactly the same: you navigate between the same circles along the same connections, but you can also teleport to the circle you choose.
    >
    > If you did the task again, which circle would you choose to use for instant teleportation?
  `);

  function formWithValidation({stimulus, validate}) {
    return {
      type: 'HTMLForm',
      validate: formData => {
        const correct = validate(formData);
        if (!correct) {
          $('fieldset').prop('disabled', true).find('label').css('opacity', 0.5);
          $('fieldset').find(':input').prop('checked', false);
          $('.validation').text('Incorrect answer. Locked for 3 seconds. Read instructions again.')
          setTimeout(() => {
            $('fieldset').prop('disabled', false).find('label').css('opacity', 1.0);
          }, 3000);
        }
        return correct;
      },
      stimulus,
    };
  }

  let updateProgress = makeUpdateProgress(
    config.transitionOrders.length +
    trials.length +
    config.probes.length +
    config.acceptreject.length);

  var timeline = _.flatten([
    inst,
    /*
    makeSimpleInstruction(`
      First, we will familiarize you to each location and its neighbors.

      <b>Afterwards, we will quiz you to see if you learned the structure.</b>
    `),
    cgt,
    */
    // busInstruction,
    makeSimpleInstruction(`
      First, you will perform a series of navigation tasks. We'll start with some practice.

      Your goal is to navigate to the goal marked yellow in as few steps as possible.

      ${renderSmallEmoji(null, 'GraphNavigation-goal')}
    `),
    {
      type: 'HTMLForm',
      stimulus: `
      ## ☝️ Helpful hint:

      When navigating to a goal, one strategy is to set __subgoals__.

      For example, imagine taking a road trip from Miami to Los Angeles 🚗.
      You might plan to get to a subgoal in Texas from Miami and
      then from there to Los Angeles.

      <img src="static/optdisco/images/usa.png" style="width:700px">

      In your own words, please explain what you think a subgoal is.

      <textarea cols="50" rows="3" name="subgoal"></textarea>

      __Also, please note that at the end of this experiment, we will ask you several questions about your subgoals.__
      `,
    },
    gn([
      {start: 1, goal: 3, practice: true, showMap: false},
    ]),
    {
      type: 'MapInstruction',
      graph,
      graphics: gfx,
      stateOrder,
      graphRenderOptions,
      planarOptions,
    },
    gn([
      {start: 6, goal: 8, practice: true},
      {start: 1, goal: 5, practice: true},
    ]),
    practiceOver,
    gn(trials),

    /* Solway 2014-style question */
    formWithValidation({
      validate: formData => formData.comprehension == 'Any location you would visit',
      stimulus: markdown(`
      Great job!

      Now, we will show you start and goal locations like before, but you do not have to navigate.

      Instead, just click on a location you would visit along your route. It can be any location you would visit.

      **The connections between locations will be hidden**, so make sure to study the unscrambled map.

      After answering this comprehension question, you will perform a practice round.<br />
      <br />
      <h3>For the next rounds, what should you select?</h3>
      <br />
      <span class="validation" style="color: red; font-weight: bold;"></span><br />
      <label><input type="radio" name="comprehension" value="The location just before the goal" />The location just before the goal</label><br />
      <label><input type="radio" name="comprehension" value="Any location you would visit" />Any location you would visit</label><br />
      <label><input type="radio" name="comprehension" value="The first location you would visit" />The first location you would visit</label><br />
      <label><input type="radio" name="comprehension" value="Any location" />Any location</label><br />
      `),
    }),
    pi('solway2014', [
      {start: 0, goal: 4, practice: true},
      {start: 5, goal: 9, practice: true},
    ]),
    practiceOver,
    pi('solway2014', config.probes),

    /* Now, the subgoal questions */
    formWithValidation({
      validate: formData => formData.comprehension == 'A subgoal that comes to mind or the goal',
      stimulus: `
      Great job!

      Now, we want to check how you chose subgoals 🤔.

      We will show you start and goal locations like before, but you do not have to navigate. Instead, just click on the location you would set as a subgoal if you were to navigate. If you do not have a subgoal, just click on the goal.

      After answering this comprehension question, you will perform a practice round.<br />
      <br />
      <h3>For the next rounds, what should you select?</h3>
      <br />
      <span class="validation" style="color: red; font-weight: bold;"></span><br />
      <label><input type="radio" name="comprehension" value="Only the goal" />Only the goal</label><br />
      <label><input type="radio" name="comprehension" value="Anything" />Anything</label><br />
      <label><input type="radio" name="comprehension" value="A subgoal that comes to mind or anything" />A subgoal that comes to mind or anything</label><br />
      <label><input type="radio" name="comprehension" value="A subgoal that comes to mind or the goal" />A subgoal that comes to mind or the goal</label><br />
      `,
    }),
    /*
    makeSimpleInstruction(`
      Great job!

      Now, we want to check how you chose subgoals 🤔.

      We will show you start and goal locations like before, but you do not have to navigate. Instead, just click on the location you would set as a subgoal if you were to navigate. If you do not have a subgoal, just click on the goal.

      After answering a comprehension question, you will perform a practice round.
      `),
    {
      type: 'survey-multi-choice',
      preamble: `
        <h1>Comprehension check</h1>
      `,
        // Please answer the following question to ensure you understand.
      questions: [
        {
          prompt: 'For the next rounds, what should you select?',
          options: [
            '&nbsp;Only the goal',
            '&nbsp;Anything',
            '&nbsp;A subgoal that comes to mind or anything',
            '&nbsp;A subgoal that comes to mind or the goal'
          ],
          required: true
        }

      ]
    },
    */
    pi('subgoal', [
      {start: 0, goal: 4, practice: true},
      {start: 5, goal: 9, practice: true},
    ]),
    practiceOver,
    pi('subgoal', config.probes),
    arInstruction,
    arKeyPractice,
    makeSimpleInstruction("Now we'll try some practice questions."),
    ar([
      {start: 0, goal: 4, probe: 1, practice: true},
      {start: 5, goal: 9, probe: 8, practice: true},
    ]),
    practiceOver,
    ar(config.acceptreject),
    pi('busStop', [{identifyOneState: true}]),
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
      min_width: 800,
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
