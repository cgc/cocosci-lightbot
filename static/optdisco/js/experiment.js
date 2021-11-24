import {Graph, clockwiseKeys} from './graphs.js';
import {AdaptiveTasks} from './adaptive.js';
import {invariant, markdown, graphics, graphicsLoading, random} from './utils.js';
import {renderSmallEmoji} from './jspsych-CircleGraphNavigation.js';
import './jspsych-CircleGraphNavigationInstruction.js';
import allconfig from './configuration/configuration.js';
import {handleError, psiturk, requestSaveData, startExperiment, CONDITION} from '../../js/setup.js';
import _ from '../../lib/underscore-min.js';
import $ from '../../lib/jquery-min.js';
import jsPsych from '../../lib/jspsych-exported.js';

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

const simpleDebrief = () => [{
  type: 'survey-multi-choice',
  preamble: markdown(`
  # Experiment complete

  Thanks for participating! Please answer the questions below before
  submitting the experiment.
  `),
  button_label: 'Submit',
  questions: [
    {prompt: "Did you draw or take a picture of the map? If so, how often did you look at it? Note: Your completed experiment will be accepted regardless of your answer to this question.", name: 'draw-picture-map', options: ['Did not draw/take picture', 'Rarely looked', 'Sometimes looked', 'Often looked'], required:true},
  ],
}];

const debrief = () => [{
  type: 'survey-multi-choice',
  preamble: markdown(`
  # Experiment complete

  Thanks for participating! Please answer the questions below before
  submitting the experiment.
  `),
  button_label: 'Submit',
  questions: [
    {prompt: "Which hand do you use to write?", name: 'hand', options: ['Left', 'Right', 'Either'], required:true},
    {prompt: "In general, do you consider yourself detail-oriented or a big picture thinker?", name: 'detail-big-picture', options: ['Detail-Oriented', 'Big Picture Thinker', 'Both', 'Neither'], required:true},
    {prompt: "Did you take a picture of the map? If you did, how often did you have to look at it? Note: Your completed experiment will be accepted regardless of your answer to this question.", name: 'picture-map', options: ['Did not take picture', 'Rarely looked at picture', 'Sometimes looked at picture', 'Often looked at picture'], required:true},
    {prompt: "Did you draw the map out? If you did, how often did you have to look at it? Note: Your completed experiment will be accepted regardless of your answer to this question.", name: 'draw-map', options: ['Did not draw map', 'Rarely looked', 'Sometimes looked', 'Often looked'], required:true},
  ],
}, {
  type: 'survey-text',
  preamble: markdown(`
  # Experiment complete

  Thanks for participating! Please answer the questions below before
  submitting the experiment.
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

function configForCondition(allconfig, condition, mapper=(f, v) => v) {
  allconfig = jsPsych.utils.deepCopy(allconfig);
  let keyidx = [];
  for (const [factor, values] of Object.entries(allconfig.conditionToFactors)) {
    const idx = mapper(factor, values[condition]); // condition is an index into this data structure that is column-wise.
    keyidx.push([factor.split('.'), idx]);
  }
  // We sort to ensure that shorter keys appear first, so that their
  // conditions are applied before any that are more nested.
  keyidx = _.sortBy(keyidx, ([keys, idx]) => keys.length);
  for (const [keys, idx] of keyidx) {
    // We walk the configuration to reach the parent of the current key.
    let c = allconfig;
    for (const key of keys.slice(0, keys.length-1)) {
      c = c[key];
    }
    // We assign the appropriate value to replace the array of potential values.
    const key = keys[keys.length-1];
    c[key] = c[key][idx];
  }
  return allconfig;
}

async function initializeExperiment() {
  psiturk.recordUnstructuredData('browser', window.navigator.userAgent);

  const onlyShowCurrentEdges = true;

  const configuration = configForCondition(allconfig, CONDITION, function(factorName, condValue) {
    const key = 'condition.'+factorName;
    return QUERY.has(key) ? QUERY.get(key) : condValue;
  });

  console.log('cond', CONDITION, 'configuration', configuration)

  const graph = new Graph(configuration.graph.adjacency);

  const gfx = configuration.icons;

  // TODO TODO TODO: for circle graphs, we can do scaleEdgeFactor, but for planar they look bad
  const graphRenderOptions = {
    onlyShowCurrentEdges,
    fixedXY: configuration.embedding.coordinates,
    width: 800,
    height: 450,
    scaleEdgeFactor: 0.95,
    // HACK Should think a bit more carefully about this one.
    // Since the order doesn't necessarily match the xy projection, this won't
    // exactly be the clockwise algorithm we've made. But it should still be
    // consistent in the way it maps angles to keys relative to the original ordering.
    successorKeys: clockwiseKeys(graph, configuration.embedding.order),
  };
  const planarOptions = {
    type: configuration.embedding.type, // HACK
    // For Solway planarization.
    fixedXY: configuration.embedding.coordinates,
//    keyDistanceFactor: 1.35, can we nix this?
    width: 800,
    height: 450,
    scaleEdgeFactor: 1,
    // HACK we don't use this, but should really implement something more useful?????
    successorKeys: clockwiseKeys(graph, configuration.embedding.order),
  };

  var inst = {
    type: 'CircleGraphNavigationInstruction',
    graph,
    graphics: gfx,
    trialsLength: configuration.graph.ordering.navigation.length,
    ...configuration.graph.ordering.navigation_practice_len2[0],
    graphRenderOptions: {...graphRenderOptions, onlyShowCurrentEdges: false},
    onlyShowCurrentEdges,
  };

  function addShowMap(trials) {
    /*
    For now, we show the map every other trial.
    */
    return trials.map((t, idx) => ({showMap: (idx % 2) == 0, ...t}));
  }

  const at = new AdaptiveTasks(graph);

  var gn = (trials) => ({
    type: 'CircleGraphNavigation',
    graph,
    graphics: gfx,
    timeline: addShowMap(trials),
    graphRenderOptions,
    planarOptions,
  });

  function gnAdaptive(trials) {
    trials = addShowMap(trials);
    const trialsAdaptive = [];
    for (const t of trials) {
      trialsAdaptive.push(t);
      trialsAdaptive.push({
        showMap: false, // Accidentally left this out before (so it was falsey), but adding now to be explicit.
        dynamicProperties: () => at.sampleLowOccTrial(),
      });
    }
    return {
      type: 'CircleGraphNavigation',
      graph,
      graphics: gfx,
      onStateVisit: (s) => at.onStateVisit(s),
      timeline: trialsAdaptive,
      graphRenderOptions,
      planarOptions,
    };
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

  const makePracticeOver = () => makeSimpleInstruction(`
    Now, we'll move on to the real questions.
  `);

  var timeline = _.flatten([
    /*
    {
      type: 'FollowPath',
      graph,
      graphics: gfx,
      timeline: [{
        start: 0,
        goal: 1,
      }],
      graphRenderOptions,
      planarOptions,
    },
    {
      type: 'CGTransition',
      graph,
      graphics: gfx,
      timeline: [{
        start: 0,
        cues: [0, 1],
      }],
      graphRenderOptions,
      planarOptions,
    },
    */
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
    gn(configuration.graph.ordering.navigation_practice_len1.map(t => ({...t, showMap: false}))), // hACK do we need this showmap: False???
    {
      type: 'MapInstruction',
      graph,
      graphics: gfx,
      graphRenderOptions,
      planarOptions,
    },
    gn(configuration.graph.ordering.navigation_practice_len2),
    makePracticeOver(),
    gnAdaptive(configuration.graph.ordering.navigation),

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
    pi('solway2014', configuration.graph.ordering.navigation_practice_len2),
    makePracticeOver(),
    pi('solway2014', configuration.graph.ordering.probes_solway2014),

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
    pi('subgoal', configuration.graph.ordering.navigation_practice_len2),
    makePracticeOver(),
    pi('subgoal', configuration.graph.ordering.probes_subgoal),
    pi('busStop', [{identifyOneState: true}]),
    simpleDebrief(),
  ]);

  if (location.pathname == '/testexperiment') {
    const type = QUERY.get('type');
    if (type) {
      timeline = timeline.filter(t => t.type == type);
    } else {
      // If we aren't filtering by a type, we'll cut down the number of trials per type at least.
      timeline = timeline.map(t => {
        if (t.timeline) {
          t.timeline = t.timeline.slice(0, 2);
        }
        return t;
      });
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
    requestSaveData();
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
    invariant(!entry.on_finish, 'No on_finish should be specified. This might be happening because a timeline element is being reused.');
    entry.on_finish = on_finish;
  }
}

$(window).on('load', function() {
  return Promise.all([graphicsLoading, requestSaveData()]).then(function() {
    $('#welcome').hide();
    return initializeExperiment();
  }).catch(handleError);
});

const errors = [];
function recordError(e) {
  try {
    if (!e) {
      // Sometimes window.onerror passes in empty errors?
      return;
    }
    // Since error instances seem to disappear over time (as evidenced by lists of null values), we immediately serialize them here.
    errors.push(JSON.stringify([e.message, e.stack]));
    psiturk.recordUnstructuredData('error2', JSON.stringify(errors));
    requestSaveData().catch(() => {}); // Don't throw an error here to avoid infinite loops.
  } catch(inner) {
    console.log('Error happened while recording error', inner.stack);
  }
}
window.onerror = function(message, source, lineno, colno, error) {
  console.error(message, error);
  recordError(error);
};
window.addEventListener('unhandledrejection', function(event) {
  console.error(event.reason);
  recordError(event.reason);
});
