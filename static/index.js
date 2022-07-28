import jQuery from './lib/jquery-min.js';
import './lib/underscore-min.js';
import './lib/backbone-min.js';

// HACK: to make bootstrap work, we both have to set jQuery on window and dynamically import
window.jQuery = jQuery;
import('./lib/bootstrap.min.js')

import './css/bootstrap.min.css';
import './css/style.css';
import './lib/jspsych-6.0.1/css/jspsych.css';
import './lightbot/css/base.css';
//import './lightbot/css/lightbot.css';

import './lib/jspsych-exported.js';

import './js/psiturk.js';
import './js/setup.js';

import './lightbot/js/experiment.js';
