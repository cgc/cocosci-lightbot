import './lightbot/css/index.css';

import jQuery from './lib/jquery-min.js';
import './lib/underscore-min.js';
import './lib/backbone-min.js';

// HACK: to make bootstrap work, we both have to set jQuery on window and dynamically import
window.jQuery = jQuery;
import('./lib/bootstrap.min.js')

import './lib/jspsych-exported.js';

import './js/psiturk.js';
import './js/setup.js';

import {configureExperimentLoad} from './lightbot/js/experiment.js';

configureExperimentLoad();
