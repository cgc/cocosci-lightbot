// import {invariant} from '../../optdisco/js/utils.js';
// import {handleError, psiturk, requestSaveData, startExperiment, CONDITION} from '../../js/setup.js';
import _ from '../lib/underscore-min.js';
window._ = _;
import $ from '../lib/jquery-min.js';
import {filterTimelineForTesting, makeTimeline, makeLightOrderTimeline, debrief} from '../lightbot/js/timeline.js';
import { assetsLoaded } from '../lightbot/js/lb/view/game.js';
import {hasNecessaryCanvasSupport, handleError, configureProgress} from '../lightbot/js/experiment.js';
import { invariant } from '../optdisco/js/utils.js';
import jsPsych from '../lib/jspsych-exported.js';

const QUERY = new URLSearchParams(location.search);

// No-op
window.requestSaveData = function() {};


function filterTimeline(filter, timeline) {
  if (filter == "all") {
    return timeline;
  }

  const prefix = [
    { type: 'fullscreen', fullscreen_mode: true },
  ];
  const suffix = [
    { type: 'fullscreen', fullscreen_mode: false },
  ].concat(debrief());

  // prefix/suffix
  invariant(_.isEqual(timeline.slice(0, prefix.length), prefix));
  invariant(_.isEqual(timeline.slice(timeline.length - suffix.length, timeline.length), suffix));
  timeline = timeline.slice(prefix.length, timeline.length - suffix.length);
  invariant(timeline.length == 8);

  const tasksPrefix = 'tasks-';
  if (filter == "tutorial") {
    return timeline.slice(0, 6);
  } else if (filter == "tasks") {
    return timeline.slice(6, 8);
  } else if (filter.startsWith(tasksPrefix)) {
    let t = timeline[7];
    let idx = parseInt(filter.slice(tasksPrefix.length), 10);
    return [{...t, timeline: [t.timeline[idx]]}];
  }
}

async function experiment(filter) {
  let timeline = makeTimeline({});

  timeline = filterTimeline(filter, timeline);

  configureProgress(timeline);

  const config = {
    timeline,
    show_progress_bar: true,
    auto_update_progress_bar: false,
    auto_preload: false,
    exclusions: {
      min_width: 800,
    },
    display_element: 'jspsych-target',
    on_finish: function() {
      $('#jspsych-target').empty();
      $('#welcome').show();
    },
    // on_data_update: function(data) {}
  };
  return jsPsych.init(config);
}

async function runExperiment(filter) {
  return Promise.all([assetsLoaded]).then(function() {
    $('#welcome').hide();
    return experiment(filter);
  });
  // TODO error handling for demo?
}

$(window).on('load', function() {
  document.querySelector('#welcome').addEventListener('click', (e) => {
    const filter = e.target.getAttribute('data-run-filter');
    if (!filter) {
      return;
    }
    runExperiment(filter);
  });
});
