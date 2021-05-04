import {Graph, clockwiseKeys} from './graphs.js';
import {graphics, graphicsUrl, graphicsLoading} from './utils.js';
import {renderSmallEmoji} from './jspsych-CircleGraphNavigation.js';
import './jspsych-CircleGraphNavigationInstruction.js';
import '../../lib/jspsych-6.0.1/plugins/jspsych-html-button-response.js';
import allconfig from './configuration/configuration.js';

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

const QUERY = new URLSearchParams(location.search);

async function initializeExperiment() {
  psiturk.recordUnstructuredData('browser', window.navigator.userAgent);

  const onlyShowCurrentEdges = true;
  const cond = QUERY.hasOwnProperty('condition') ? QUERY.condition : CONDITION;
  console.log('cond', cond)
  const configuration = allconfig.conditions[cond];
  console.log('configuration', configuration)

  const graph = new Graph(configuration.adjacency);

  const gfx = jsPsych.randomization.sampleWithoutReplacement(graphics, graph.states.length);
  psiturk.recordUnstructuredData('gfx', gfx);

  // TODO TODO TODO: for circle graphs, we can do scaleEdgeFactor, but for planar they look bad
  const graphRenderOptions = {
    onlyShowCurrentEdges,
    fixedXY: configuration.circle_embedding.coordinates,
    width: 800,
    height: 450,
    scaleEdgeFactor: 0.95,
    successorKeys: clockwiseKeys(graph, configuration.circle_embedding.order),
  };
  const planarOptions = {
    type: configuration.map_embedding.type, // HACK
    // For Solway planarization.
    fixedXY: configuration.map_embedding.coordinates,
//    keyDistanceFactor: 1.35, can we nix this?
    width: 800,
    height: 450,
    scaleEdgeFactor: 1,
    // HACK we don't use this, but should really implement something more useful?????
    successorKeys: clockwiseKeys(graph, configuration.circle_embedding.order),
  };

  var inst = {
    type: 'CircleGraphNavigationInstruction',
    graph,
    graphics: gfx,
    trialsLength: configuration.navigation.length,
    ...configuration.navigation_practice_len2[0],
    graphRenderOptions: {...graphRenderOptions, onlyShowCurrentEdges: false},
    onlyShowCurrentEdges,
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
    timeline: addShowMap(trials),
    graphRenderOptions,
    planarOptions,
  });

  var piInstruction = makeSimpleInstruction(`
    In this next section, we want to understand how you are planning your
    routes. For the next ${configuration.probes.length} rounds, we will show you a
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
    timeline: addShowMap(timeline),
    //timeLimit: timeLimit,
    identifyOneState: true,
    graphRenderOptions: {...graphRenderOptions, edgeShow: () => false},
    planarOptions,
  });

  function renderKey(key) {
    return `<span
      class="GraphNavigation-key GraphNavigation-key-${key}"
      style="opacity: 1; position: relative; display: inline-block;">${key}</span>`;
  }

  const practiceOver = makeSimpleInstruction(`
    Now, we'll move on to the real questions.
  `);

  var timeline = _.flatten([
    inst,
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
    gn(configuration.navigation_practice_len1.map(t => ({...t, showMap: false}))), // hACK do we need this showmap: False???
    {
      type: 'MapInstruction',
      graph,
      graphics: gfx,
      graphRenderOptions,
      planarOptions,
    },
    gn(configuration.navigation_practice_len2),
    practiceOver,
    gn(configuration.navigation),

    /* Solway 2014-style question */
    formWithValidation({
      validate: formData => formData.comprehension == 'Any location you would visit',
      stimulus: markdown(`
      Great job!

      Now, we will show you start and goal locations like before, but you do not have to navigate.

      Instead, just click on a location you would visit along your route. It can be any location you would visit.

      **The connections between locations will be hidden**, so make sure to study the map with all the connections.

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
    pi('solway2014', configuration.navigation_practice_len2),
    practiceOver,
    pi('solway2014', configuration.probes),

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
    pi('subgoal', configuration.navigation_practice_len2),
    practiceOver,
    pi('subgoal', configuration.probes),
    pi('busStop', [{identifyOneState: true}]),
    debrief(),
  ]);

  if (location.pathname == '/testexperiment') {
    const type = QUERY.get('type');
    if (type) {
      timeline = timeline.filter(t => t.type == type);
    } else {
      // If we aren't filtering by a type, we'll cut down the number of trials per type at least.
      timeline = timeline.map(t => ({...t, timeline: t.timeline ? t.timeline.slice(0, 1) : [{}]}));
    }
  }

  configureProgress(timeline);

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

function configureProgress(timeline) {
  let done = 0;
  function on_finish() {
    done++;
    jsPsych.setProgressBar(done/total);
    saveData();
  }

  let total = 0;
  for (const entry of timeline) {
    invariant(entry.type);
    if (entry.timeline) {
      for (const subentry of entry.timeline) {
        // We don't permit recursion!
        invariant(!subentry.type);
        invariant(!subentry.timeline);
      }
      total += entry.timeline.length;
    } else {
      total++;
    }
    invariant(!entry.on_finish, 'No on_finish should be specified.');
    entry.on_finish = on_finish;
  }
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
