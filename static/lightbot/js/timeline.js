import { invariant, markdown, graphics, graphicsLoading, random, QUERY } from '../../optdisco/js/utils.js';
import { handleError, psiturk, requestSaveData, startExperiment, CONDITION } from '../../js/setup.js';
import _ from '../../lib/underscore-min.js';
import $ from '../../lib/jquery-min.js';

import mapData from '../json/maps.json';
import originalMaps from '../json/original-maps.json';
import cgcMaps from '../json/cgc-maps.json';
import mapTimelineConditions from '../json/map-timeline.conditions.json';

import lot0 from '../json/light-order-timeline.random0.json';
import lot1 from '../json/light-order-timeline.random1.json';
import lot2 from '../json/light-order-timeline.random2.json';
import lot3 from '../json/light-order-timeline.random3.json';

import jsPsych from '../../lib/jspsych-exported.js';
import '../../lib/jspsych-6.0.1/plugins/jspsych-survey-text.js';
import '../../lib/jspsych-6.0.1/plugins/jspsych-survey-multi-choice.js';
import '../../lib/jspsych-6.0.1/plugins/jspsych-fullscreen.js';

import './LightbotTask';
import { normalInstructions, instructionsByName, instructionsByActionCode } from './lb/instructions.js';
import { DELAY, humanizeDuration, renderInstructionToHTML } from './LightbotTask';

function parseSerializedProgram(p) {
  const [main, process1, process2, process3, process4] = p.split('|');
  const rv = {main, process1, process2, process3, process4};
  for (const k of Object.keys(rv)) {
    rv[k] = Array.from(rv[k]).map(code => instructionsByActionCode[code].instructionName);
  }
  return rv;
}

const mapSources = {
  maps: mapData,
  originalMaps,
  cgcMaps,
};

function updatedMap(m, fn) {
  return m.map((row, x) => row.map((cell, y) => fn(cell, x, y)));
}

export function money(dollars) {
  return `$${dollars.toFixed(2)}`;
}

function formWithValidation({ stimulus, validate }) {
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
    { prompt: "How much experience do you have with computer programming?", name: 'exp-prog', options: ['None', 'Between 1 and 3 college courses (or equivalent)', 'More than 3 college courses (or equivalent)'], required: true },
    { prompt: "Have you played Lightbot or another similar programming game before?", name: 'exp-prog-game', options: ['Yes', 'No'], required: true },
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
    {
      'prompt': 'What strategy did you use?',
      'rows': 2, columns: 60
    },
    {
      'prompt': 'Was anything confusing or hard to understand?',
      'rows': 2, columns: 60
    },
    {
      'prompt': 'Do you have any suggestions on how we can improve the instructions or interface?',
      'rows': 2, columns: 60
    },
    {
      'prompt': 'Describe any technical difficulties you might have encountered.',
      'rows': 2, columns: 60
    },
    {
      'prompt': 'Any other comments?',
      'rows': 2, columns: 60
    }
  ]
}];

const makeSimpleInstruction = (text) => ({
  type: "SimpleInstruction",
  stimulus: markdown(text),
});

function _instDemo(config) {
  const outro = 'To see it again, click **Reset** then **Run**.';
  return {
    ui: 'normalInstructionsEditor',
    playAfterRun: true,
    editorOptions: {
      editable: false,
    },
    ...config,
    msgIntro: config.msgIntro,
    msgOutro: config.msgIntro + '\n\n' + outro,
    msgWhileExecuting: config.msgIntro,
  };
}

function lengthTutorial() {
  const processMap = {
    ...originalMaps[8],
    map: updatedMap(originalMaps[8].map, (cell, x, y) =>
      x > 4 && y == 4 ? { h: 1, t: 'b' } :
        cell
    ),
  };

  const header = `
  The **Instruction Count** is the total number of instructions listed under **Main** and all
  **Process** frames. Every instruction counts!

  In all these examples, lightbot takes exactly 8 steps. But, the bonus will be based on the **Instruction Count**, not steps.
  `;

  const t = [
    {
      map: processMap,
      sequence: [
        {
          classList: {
            add: {
              ['.Counter.is-length']: 'glow',
            },
            remove: {
              ['.Counter.is-length']: 'hide',
            }
          },
          message: `
          ${header}

          Solving this problem without processes takes **8 instructions**.
          `,
          program: ['walk', 'light', 'walk', 'light', 'walk', 'light', 'walk', 'light'],
        },
        {
          message: `
          ${header}

          Clever use of processes can help you reduce down to **6 instructions**. This solution would receive a **high bonus**.
          `,
          program: {
            main: ['process1', 'process1', 'process1', 'process1'],
            process1: ['walk', 'light']
          },
        },
        {
          message: `
          ${header}

          An even shorter solution is possible if you make a loop! This only uses **4 instructions**. This solution would receive the **full bonus**.
          `,
          program: {
            main: ['process1'],
            process1: ['walk', 'light', 'process1']
          },
        },
        {
          message: `
          ${header}

          Remember that we count **all** instructions, so a program like this uses an extra instruction. It has a total of **9 instructions** and would receive a **small bonus**.
          `,
          program: {
            main: ['process1'],
            process1: ['walk', 'light', 'walk', 'light', 'walk', 'light', 'walk', 'light'],
          },
        },
      ],
    },
  ];
  return { type: 'LightbotTutorialSequence', timeline: t };
}

function stepCountTutorial() {
  const map = {
    ...originalMaps[0],
    map: updatedMap(originalMaps[0].map, (cell, x, y) =>
      x == 3 && y < 6 ? { h: 2, t: 'b' } :
        cell
    ),
    direction: 1,
  };

  const t = [
    _instDemo({
      map,
      program: {
        main: ['process1', 'turnRight', 'process1', 'turnRight', 'process1', 'light'],
        process1: ['walk', 'walk']
      },
      classList: {
        remove: {
          ['.Counter.is-step']: 'hide',
          ['.Editor-counters']: 'hide',
        },
      },
      ui: 'normalInstructionsEditorWithProcess1',
      msgIntro: `
      **Step Count** is the number of basic instructions it takes for lightbot to reach the goal.
      Every basic instruction lightbot executes is counted. The basic instructions are:
      ${normalInstructions.map(i => renderInstructionToHTML(i)).join('')}

      Even when there are process instructions, each time they are run the basic instructions are counted again.

      However, **Step Count** excludes process instructions after the basic instructions have been counted.
      `,
    }),

    _instDemo({
      map,
      program: {
        main: ['turnRight', 'jump', 'jump', 'light'],
      },
      classList: {
        remove: {
          ['.Counter.is-step']: 'hide',
          ['.Editor-counters']: 'hide',
        },
      },
      ui: 'normalInstructionsEditorWithProcess1',
      msgIntro: `
      This problem can be solved with a smaller **Step Count**.
      `,
    }),

  ];
  return { type: 'LightbotTutorial', timeline: t };
}

export function makeTutorial() {

  const editingIntro = `
  Drag instructions under **Main** for lightbot.
  Execute them by clicking **Run**.
  Bring lightbot back to the beginning by clicking **Reset**.

  When all lights are lit 💡 you can move on.
  `;

  const processMap = {
    ...originalMaps[8],
    map: updatedMap(originalMaps[8].map, (cell, x, y) =>
      x > 4 && y == 4 ? { h: 1, t: 'b' } :
        cell
    ),
  };

  const t = [
    {
      map: originalMaps[0],
      ui: 'playOnce',
      program: ['walk', 'walk', 'light'],
      msgIntro: 'This is **lightbot**, a robot. Your goal is to help lightbot turn on all the blue light tiles.',
      msgWhileExecuting: 'When all the light tiles are activated 💡...',
      msgOutro: 'When all the light tiles are activated 💡...\n\nThe level is complete! 🎉',
    },

    _instDemo({
      map: originalMaps[0],
      program: ['walk', 'walk', 'light'],
      msgIntro: `
      Lightbot is controlled by the list of instructions under **Main**, like you can see here.
      `,
    }),

    _instDemo({
      map: originalMaps[0],
      program: ['walk'],
      glow: 'walk',
      msgIntro: `
      In this experiment, you will control lightbot's actions by giving him instructions to execute. Let's go over the 5 basic instructions you can give to lightbot.

      First, we'll start with ${renderInstructionToHTML(instructionsByName.walk)}. When walking forward, the robot will advance one square in the direction it is facing.
      `,
    }),

    _instDemo({
      map: {
        ...originalMaps[3],
        position: { x: 4, y: 6 },
      },
      program: ['walk'],
      glow: 'walk',
      msgIntro: `
      Lightbot will only walk if the tile it is facing is the **same height** as the tile it is currently on. In this example, the tile is higher than the current tile, so lightbot can't walk ❌.
      `,
    }),

    _instDemo({
      map: {
        ...originalMaps[0],
        map: updatedMap(originalMaps[0].map, (cell, x, y) =>
          x == 2 && y == 4 ? { h: 1, t: 'l' } :
            cell
        ),
      },
      program: ['light', 'light', 'walk', 'light'],
      glow: 'light',
      msgIntro: `
      The ${renderInstructionToHTML(instructionsByName.light)} instruction is used to turn light tiles on or off.

      If the robot is located over an unlit (blue) light tile, the light instruction will turn the tile on.

      If the robot is located over a lit (yellow) light tile, the light instruction will turn the tile off.

      If the robot is located on a normal tile, nothing happens.
      `,
    }),

    {
      map: originalMaps[0],
      ui: 'normalInstructionsEditor',
      requiresSuccess: true,
      msgIntro: `
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
        position: { x: 4, y: 6 },
      },
      program: ['jump', 'jump'],
      glow: 'jump',
      msgIntro: `
      ${renderInstructionToHTML(instructionsByName.jump)} is a combination of moving forward and changing height. The robot will move in the direction it is facing.
      `,
    }),

    _instDemo({
      map: {
        ...originalMaps[2],
        position: { x: 3, y: 3 },
        direction: 1,
      },
      program: ['jump'],
      glow: 'jump',
      msgIntro: `
      An **upward jump** only works if the destination tile is exactly one step higher than the current tile. In this example, the destination tile is three steps higher than the current tile, so lightbot can't jump up ❌.
      `,
    }),

    _instDemo({
      map: {
        ...originalMaps[2],
        position: { x: 4, y: 3 },
      },
      program: ['jump'],
      glow: 'jump',
      msgIntro: `
      For a **downward jump**, there is no limit to the height the robot can jump down from.
      `,
    }),

    {
      map: originalMaps[3],
      ui: 'normalInstructionsEditor',
      requiresSuccess: true,
      msgIntro: `
      Now, let's practice jumping.
      ${editingIntro}
      `,
      msgOutro: `
      Great job!
      `,
    },

    _instDemo({
      map: originalMaps[0],
      program: ['turnLeft', 'turnLeft', 'turnLeft', 'turnLeft', 'turnRight', 'turnRight', 'turnRight', 'turnRight'],
      glow: ['turnLeft', 'turnRight'],
      msgIntro: `
      When turning, the robot will stay in place and rotate its body 90 degrees (quarter turn). The robot can either turn
      - ${renderInstructionToHTML(instructionsByName.turnLeft)} (counter-clockwise) or
      - ${renderInstructionToHTML(instructionsByName.turnRight)} (clockwise)
      `,
    }),

    {
      map: originalMaps[2],
      ui: 'normalInstructionsEditor',
      requiresSuccess: true,
      msgIntro: `
      Now, let's practice turning.
      ${editingIntro}
      `,
      msgOutro: `
      Great job!
      `,
    },

    _instDemo({
      map: processMap,
      program: {
        main: ['process1', 'process1', 'process1', 'process1'],
        process1: ['walk', 'light'],
      },
      ui: 'normalInstructionsEditorWithProcess1',
      msgIntro: `
      In addition to the basic instructions, you can also define sequences of actions that can be called with a single instruction. They are called processes.

      To define a process, drag a series of instructions into a **Process** frame. Then, you'll use the corresponding **Process** instruction. When it is executed, it will execute all the listed instructions under the frame.
      `,
    }),

    _instDemo({
      map: processMap,
      program: {
        main: ['process1'],
        process1: ['walk', 'light', 'process1'],
      },
      ui: 'normalInstructionsEditorWithProcess1',
      msgIntro: `
      You can also call a process within itself to define a **looped process**. The loop will repeat until all the lights are on 💡.

      If some lights are still off, then lightbot will get stuck looping. You can always stop lightbot by clicking **Stop**.

      You can see the **Stop** button on this page if you click **Reset** then **Run**.
      `,
    }),

  ];
  return { type: 'LightbotTutorial', timeline: t };
}

export const BONUS = 0.40;

export function makeTimeline(configuration) {
  const condition = QUERY.get('condition') || window.CONDITION || 0;
  console.log('condition', condition);
  const mapTimeline = mapTimelineConditions[condition];
  const maps = mapTimeline.map(([source, idx]) => ({
    map: mapSources[source][idx],
    addToData: {source: [source, idx], practice: false},
  }));

  return _.flatten([
    { type: 'fullscreen', fullscreen_mode: true },
    makeTutorial(),
    makeSimpleInstruction(`
    Next up is one last practice problem.
    `),
    {
      type: 'LightbotTask',
      map: mapData[1],
      addToData: {practice: true},
      editorOptions: {
        message: markdown(`
        New features have been unlocked for you! You can use these for the rest of the experiment.

        - You can use up to **4 processes**.
        - If Run is taking too long, then try **Quick Run⚡️**.
        - If the problem is confusing, you can **adjust the view** by clicking the arrows/triangles around the 🎦 icon.
        - You can review the tutorial by clicking **Review tutorial** in the lower right.

        <br />
        Good luck with the practice problem!
        `),
      },
    },

    makeSimpleInstruction(`
    Now we will begin the study.

    You will complete ${maps.length} problems.

    Your goal is to write the **shortest solutions** you can.
    The shorter your solutions, the **bigger your bonus**!

    On the next pages, we'll explain how the length of a solution is calculated. Then, we'll explain how the bonus is calculated.
    `),
    lengthTutorial(),
    makeSimpleInstruction(`
    For each problem, the participants who find one of the shortest possible solutions based on **Instruction Count** will receive a full bonus of **${money(BONUS)}**.

    Since there are ${maps.length} total problems, there is an opportunity for a total bonus of ${maps.length} &times; ${money(BONUS)} = **${money(maps.length * BONUS)}**.

    Longer solutions will receive proportionally smaller bonuses. The average bonus will be **${money(maps.length * BONUS / 2)}**.
    `),

    makeSimpleInstruction(`
    Now we will begin the study. You will complete ${maps.length} problems.

    You will also be able to skip a problem if you get stuck by clicking **Skip**.
    You can only skip a problem after waiting for ${humanizeDuration(DELAY, 'long')}.
    You will not be eligible for a bonus on skipped problems.
    `),
    {
      type: 'LightbotTask',
      timeline: maps,
      editorOptions: {
        showLengthCounter: true,
        showSkipButton: true,
      },
    },
    { type: 'fullscreen', fullscreen_mode: false },
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

export const ORDER_BONUS = 0.10;
export function makeLightOrderTimeline(configuration) {
  const lot = [lot0, lot1, lot2, lot3][QUERY.get('condition') || window.CONDITION || 0];
  const orderTaskTimeline = lot.map((t, idx) => ({
    map: mapSources[t.addToData.source[0]][t.addToData.source[1]],
    ...t,
    program: parseSerializedProgram(t.program),
    leftToGo: lot.length - idx - 1,
  }));

  const maps = [
    ["maps", 1],
    ["maps", 6],
  ].map(([source, idx]) => ({
    map: mapSources[source][idx],
    addToData: {source: [source, idx], practice: false},
  }));

  return _.flatten([
    { type: 'fullscreen', fullscreen_mode: true },
    makeTutorial(),
    makeSimpleInstruction(`
    Now we will begin the study.

    You will complete ${maps.length} problems. After you complete the problems, we'll ask you ${orderTaskTimeline.length} quick questions about solutions that others have written.

    For these ${maps.length} problems, your goal is to write the **shortest solutions** you can.
    The shorter your solutions, the **bigger your bonus**!

    On the next pages, we'll explain how the length of a solution is calculated. Then, we'll explain how the bonus is calculated.
    `),
    lengthTutorial(),
    makeSimpleInstruction(`
    For each problem, the participants who find one of the shortest possible solutions based on **Instruction Count** will receive a full bonus of ${money(BONUS)}.

    Since there are ${maps.length} total problems, there is an opportunity for a total bonus of ${maps.length} &times; ${money(BONUS)} = ${money(maps.length * BONUS)}.

    Longer solutions will receive proportionally smaller bonuses. The average bonus will be ${money(maps.length * BONUS / 2)}.
    `),
    {
      type: 'LightbotTask',
      ...maps[0],
      editorOptions: {
        message: markdown(`
        New features have been unlocked for you! You can use these for the rest of the experiment.

        - You can use up to **4 processes**.
        - If Run is taking too long, then try **Quick Run⚡️**.
        - If the problem is confusing, you can **adjust the view** by clicking the arrows/triangles around the 🎦 icon.
        - You can review the tutorial by clicking **Review tutorial** in the lower right.
        `),
        showLengthCounter: true,
      },
    },
    {
      type: 'LightbotTask',
      ...maps[1],
      editorOptions: {
        showLengthCounter: true,
      },
    },

    makeSimpleInstruction(`
    Great job! Now, we have ${orderTaskTimeline.length} short questions for you. In these short questions, we'll show you a program
    and then ask you what order lightbot activates the lights. This is the last part of the study before we ask for your feedback.

    If your answer is correct, you will get a bonus of **${money(ORDER_BONUS)}** for each question. That means you have the opportunity to
    receive a total of **${money(ORDER_BONUS*orderTaskTimeline.length)}** if you answer all questions correctly.
    `),
    {
      type: 'LightbotLightOrderTask',
      timeline: orderTaskTimeline,
    },
    { type: 'fullscreen', fullscreen_mode: false },
    debrief(),
  ]);
}

/*
Various features to support faster testing.
*/

export function filterTimelineForTesting(timeline) {
  if (location.pathname == '/testexperiment') {
    const type = QUERY.get('type');
    if (type == 'LightbotTask' && QUERY.get('mapSource')) {
      const map = mapSources[QUERY.get('mapSource')][parseInt(QUERY.get('mapIdx'), 10)];
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
      const indexed = function(tl, idxs) {
        if (!tl || idxs.length == 0) {
          return tl;
        }
        const node = tl[idxs[0]];
        return [{
          ...node,
          timeline: indexed(node.timeline, idxs.slice(1)),
        }];
      }
      const idxs = QUERY.get('timelineIdx').split('.').map(i => parseInt(i));
      timeline = indexed(timeline, idxs)
    }
  }
  return timeline;
}

// Keyboard interface, but only when testing
if (location.pathname == '/testexperiment') {
  document.addEventListener('keydown', (e) => {
    const keyToInstruction = {
      w: instructionsByName.walk,
      j: instructionsByName.jump,
      s: instructionsByName.light,
      l: instructionsByName.turnLeft,
      r: instructionsByName.turnRight,
      "1": instructionsByName.process1,
      "2": instructionsByName.process2,
      "3": instructionsByName.process3,
      "4": instructionsByName.process4,
    };

    const main = document.querySelector('.InstructionList[data-name=main] .InstructionList-instructions');
    if (!main) {
      return;
    }

    if (e.key == 'Backspace') {
      main.children[main.children.length - 1].remove();
      return;
    }

    const inst = keyToInstruction[e.key];
    if (!inst) {
      return;
    }

    const instEl = document.querySelector(`.InstructionList.is-source .InstructionList-instruction[data-id=${inst.instructionName}]`);
    main.appendChild(instEl.cloneNode(true));
  });
}
