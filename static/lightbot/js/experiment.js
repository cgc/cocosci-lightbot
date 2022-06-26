import {invariant} from '../../optdisco/js/utils.js';
import {handleError, psiturk, requestSaveData, startExperiment, CONDITION} from '../../js/setup.js';
import _ from '../../lib/underscore-min.js';
import $ from '../../lib/jquery-min.js';
import jsPsych from '../../lib/jspsych-exported.js';
import {filterTimelineForTesting, makeTimeline} from './timeline';
import { assetsLoaded } from './lb/view/game.js';

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

  /*
  const configuration = configForCondition(allconfig, CONDITION, function(factorName, condValue) {
    const key = 'condition.'+factorName;
    return QUERY.has(key) ? QUERY.get(key) : condValue;
  });
  console.log('cond', CONDITION, 'configuration', configuration)
  */

  let timeline = makeTimeline({});

  timeline = filterTimelineForTesting(timeline);

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
  return Promise.all([requestSaveData(), assetsLoaded]).then(function() {
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
