import {invariant, markdown, graphics, graphicsLoading, random} from '../../optdisco/js/utils.js';
import {handleError, psiturk, requestSaveData, startExperiment, CONDITION} from '../../js/setup.js';
import _ from '../../lib/underscore-min.js';
import $ from '../../lib/jquery-min.js';

import mapData from '../json/maps.json';
import originalMaps from '../json/original-maps.json';
import cgcMaps from '../json/cgc-maps.json';

import jsPsych from '../../lib/jspsych-exported.js';
import '../../lib/jspsych-6.0.1/plugins/jspsych-survey-text.js';
import '../../lib/jspsych-6.0.1/plugins/jspsych-survey-multi-choice.js';
import '../../lib/jspsych-6.0.1/plugins/jspsych-fullscreen.js';

import './LightbotTask';

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
  # Experiment complete

  Thanks for participating in the study! Please answer the questions below before
  submitting the experiment.
  `),
  button_label: 'Submit',
  questions: [
    {prompt: "How much experience do you have with computer programming?", name: 'exp-prog', options: ['None', 'Between 1 and 3 college courses (or equivalent)', 'More than 3 college courses (or equivalent)'], required:true},
    {prompt: "Have you played Lightbot or another similar programming game before?", name: 'exp-prog-game', options: ['Yes', 'No'], required:true},
  ],
}, {
  type: 'survey-text',
  preamble: markdown(`
  # Experiment complete

  Thanks for participating in the study! Please answer the questions below before
  submitting the experiment.
  `),
  button_label: 'Submit',
  questions: [
    {'prompt': 'What strategy did you use?',
     'rows': 2, columns: 60},
    {'prompt': 'Was anything confusing or hard to understand?',
     'rows': 2, columns: 60},
    {'prompt': 'Do you have any suggestions on how we can improve the instructions or interface?',
     'rows': 2, columns: 60},
    {'prompt': 'Describe any technical difficulties you might have encountered.',
     'rows': 2, columns: 60},
    {'prompt': 'Any other comments?',
     'rows': 2, columns: 60}
  ]
}];

const makeSimpleInstruction = (text) => ({
  type: "SimpleInstruction",
  stimulus: markdown(text),
});

function makeTutorial() {
  const outro = 'See it again by clicking <button class="btn btn-warning">Reset</button> and <button class="btn btn-primary">Run</button>.\n\nPress spacebar when you are ready to continue.';
  const spacebarDemo = 'Press spacebar to see lightbot demonstrate.';
  function _instDemo(config) {
    return {
      ui: 'normalInstructions',
      playAfterRun: true,
      ...config,
      msgIntroNoSpacebar: config.msgIntroNoSpacebar + '\n\n' + spacebarDemo,
      msgOutroNoSpacebar: config.msgIntroNoSpacebar + '\n\n' + outro,
      msgWhileExecuting: config.msgIntroNoSpacebar,
    };
  }

  const editingIntro = `
  Drag instructions under **Main** for lightbot.
  Execute them by pressing <button class="btn btn-primary">Run</button>.
  Bring lightbot back to the beginning by pressing <button class="btn btn-warning">Reset</button>.
  
  When all lights are lit 💡 you can move on.
  `;

  const t = [
    {
      map: originalMaps[0],
      ui: 'playOnce',
      program: ['walk', 'walk', 'light'],
      msgIntro: 'This is **lightbot**, a robot. Your goal is to get lightbot to turn on all the blue light tiles.',
      msgWhileExecuting: 'When all the light tiles are activated 💡...',
      msgOutro: 'When all the light tiles are activated 💡...\n\nThe level is complete! 🎉',
    },

    _instDemo({
      map: originalMaps[0],
      // TODO make sure that button appearance isn't too jarring??
      program: ['walk'],
      glow: 'walk',
      msgIntroNoSpacebar: `
      You control lightbot's actions by giving him instructions to execute. Let's go over the 5 basic instructions you can give to lightbot.
      
      First, let's go over **Walk**. When walking forward, the robot will advance one square in the direction it is facing.
      `,
    }),

    _instDemo({
      map: {
        ...originalMaps[3],
        position: {x: 4, y: 6},
      },
      program: ['walk'],
      glow: 'walk',
      msgIntroNoSpacebar: `
      Lightbot will only walk if the tile it is facing is the **same height** as the tile it is currently on. In this example, the tile is higher than the current tile, so lightbot can't walk ❌.
      `,
    }),

    _instDemo({
      map: {
        ...originalMaps[0],
        map: originalMaps[0].map.map((row, x) => row.map((cell, y) =>
          //x == 4 && y == 4 ? {h: 1, t: 'l'} :
          x == 2 && y == 4 ? {h: 1, t: 'l'} :
          cell
        )),
        //position: {x: 4, y: 3},
      },
      program: ['light', 'walk', 'light', 'turnLeft', 'turnLeft', 'walk', 'light'],
      glow: 'light',
      msgIntroNoSpacebar: `
      The **Light** instruction is used to turn light tiles on or off.

      If the robot is located over an unlit (blue) light tile, the light instruction will turn the tile on.

      If the robot is located over a lit (yellow) light tile, the light instruction will turn the tile off.

      If the robot is located on a normal tile, nothing happens.
      `,
    }),

    _instDemo({
      map: originalMaps[0],
      program: ['walk', 'walk', 'light'],
      ui: 'normalInstructionsEditor',
      msgIntroNoSpacebar: `
      Lightbot is controlled by the list of instructions under **Main**, like you can see here.
      `,
    }),

    {
      map: originalMaps[0],
      ui: 'normalInstructionsEditor',
      requiresSuccess: true,
      msgIntroNoSpacebar: `
      Now, it's your turn to control lightbot.
      ${editingIntro}
      `,
      msgOutro: `
      Great job!
      `,
    },

    _instDemo({
      map: {
        ...originalMaps[3],
        position: {x: 4, y: 6},
      },
      program: ['jump', 'jump'],
      glow: 'jump',
      msgIntroNoSpacebar: `
      **Jump** is a combination of moving forward and changing height. The robot will move in the direction it is facing.
      `,
    }),

    _instDemo({
      map: {
        ...originalMaps[2],
        position: {x: 3, y: 3},
        direction: 1,
      },
      program: ['jump'],
      glow: 'jump',
      msgIntroNoSpacebar: `
      An **upward jump** only works if the destination tile is exactly one step higher than the current tile. In this example, the destination tile is three steps higher than the current tile, so lightbot can't jump up ❌.
      `,
    }),

    _instDemo({
      map: {
        ...originalMaps[2],
        position: {x: 4, y: 3},
      },
      program: ['jump'],
      glow: 'jump',
      msgIntroNoSpacebar: `
      For a **downward jump**, there is no limit to the height the robot can jump down from.
      `,
    }),

    {
      map: originalMaps[3],
      ui: 'normalInstructionsEditor',
      requiresSuccess: true,
      msgIntroNoSpacebar: `
      Now, let's practice jumping.
      ${editingIntro}
      `,
      msgOutro: `
      Great job!
      `,
    },

    _instDemo({
      map: originalMaps[0],
      //program: ['walk', 'turnLeft', 'walk', 'turnRight', 'walk'],
      program: ['turnLeft', 'turnLeft', 'turnLeft', 'turnLeft', 'turnRight', 'turnRight', 'turnRight', 'turnRight'],
      glow: ['turnLeft', 'turnRight'],
      msgIntroNoSpacebar: `
      When turning **Left** or **Right**, the robot will stay in place and rotate its body 90 degrees (quarter turn).
      `,
    }),

    {
      map: originalMaps[2],
      ui: 'normalInstructionsEditor',
      requiresSuccess: true,
      msgIntroNoSpacebar: `
      Now, let's practice turning.
      ${editingIntro}
      `,
      msgOutro: `
      Great job!
      `,
    },

    _instDemo({
      map: originalMaps[8],
      program: {
        main: ['process1', 'process1', 'process1', 'process1', 'process1', 'process1', 'process1'],
        process1: ['walk', 'light'],
      },
      ui: 'normalInstructionsEditorWithProcess1',
      msgIntroNoSpacebar: `
      In addition to the basic instructions, you can also define sequences of actions that can be called with a single instruction. They are called processes.

      To define a process, drag a series of instructions into a **Process** frame. Then, you'll use the corresponding **Process** instruction. When it is executed, it will execute all the listed instructions under the frame.
      `,
    }),

    _instDemo({
      map: originalMaps[8],
      program: {
        main: ['process1'],
        process1: ['walk', 'light', 'process1'],
      },
      ui: 'normalInstructionsEditorWithProcess1',
      msgIntroNoSpacebar: `
      You can also call a process within itself to define a **looped process**. It will loop until one of two things happen:
      - All the lights are lit 💡.
      - You click <button class="btn btn-danger">Stop</button> to interrupt the loop.
      `,
    }),

  ];
  return {type: 'LightbotTutorial', timeline: t};
}

export function makeTimeline(configuration) {
  const maps = [
      ...random.shuffle([mapData[6], mapData[7], mapData[8]]),
      ...random.shuffle([cgcMaps[6], cgcMaps[9]]),
  ];

  return _.flatten([
    {type: 'fullscreen', fullscreen_mode: true},
    makeTutorial(),
    makeSimpleInstruction(`
    Next up is one last practice problem.
    `),
    {
      type: 'LightbotTask',
      map: mapData[1],
      message: markdown(`
      From now on, you can use up to 4 processes.

      If it is taking too long to watch the robot with <button class="btn btn-primary">Run</button>, then use <button class="btn btn-info">Quick Run⚡️</button>.
      `),
    },
    makeSimpleInstruction(`
    Now we will begin the study. You will complete ${maps.length} levels.
    `),
    {
      type: 'LightbotTask',
      timeline: maps.map(map => ({map})),
    },
    {type: 'fullscreen', fullscreen_mode: false},
    debrief(),
  ]);

  /*
  example of form with validation
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
    */
}

const QUERY = new URLSearchParams(location.search);

export function filterTimelineForTesting(timeline) {
  if (location.pathname == '/testexperiment') {
    const type = QUERY.get('type');
    if (type == 'LightbotTask' && QUERY.get('mapSource')) {
      const map = {
          maps: mapData,
          originalMaps: originalMaps,
          cgcMaps: cgcMaps,
      }[QUERY.get('mapSource')][parseInt(QUERY.get('mapIdx'), 10)];
      timeline = [{ type, map }];
    } else if (type) {
      timeline = timeline.filter(t => t.type == type);
    } else if (QUERY.get('preview') != 'full') {
      // If we aren't filtering by a type, we'll cut down the number of trials per type at least.
      timeline = timeline.map(t => {
        if (t.timeline) {
          t.timeline = t.timeline.slice(0, 2);
        }
        return t;
      });
    }

    if (QUERY.get('timelineIdx')) {
      timeline = [timeline[parseInt(QUERY.get('timelineIdx'), 10)]];
    }
  }
  return timeline;
}
