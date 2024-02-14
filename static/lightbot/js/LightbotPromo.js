import { deg2rad } from './lb/view/CameraControls.js';
import instructions from './lb/instructions';
import { trialErrorHandling, addPlugin } from '../../optdisco/js/utils.js';
import mapData from '../json/maps.json';
import { Editor } from './LightbotTask.js';

let hide = -1;
let pillar = 50;
function _h(h=hide) {
  return {"h":h,"t":"l"};
}

const stairs = {
  map: {
    "map": [
      [{"h":"8","t":"b"},{"h":"7","t":"l"},{"h":"6","t":"b"},{"h":"5","t":"l"},{"h":"4","t":"b"}],
      [{"h":"9","t":"l"},_h(),_h(),_h(),{"h":"3","t":"l"}],
      [{"h":"10","t":"b"},_h(),_h(),_h(),_h()],
      [{"h":"11","t":"l"},_h(),_h(-15),_h(),_h()],
      [{"h":"12","t":"b"},{"h":"13","t":"l"},{"h":"14","t":"b"},_h(),_h()]
    ],
    "direction": 0,
    "position": {"x": 0, "y": 4}
  },
  program: {
    main: ['process1'],
    process1: ['process2', 'process3', 'process3', 'process2', 'process1'],
    process2: ['jump', 'light', 'jump', 'jump', 'light', 'jump', 'turnLeft'],
    process3: ['jump', 'light', 'jump', 'turnLeft'],
  },
  warps: [
    {
      curr: {x: 2, y: 0},
      next: {x: 2, y: 1},
      finalPos: {x: 4, y: 3},
      // next: {x: 4, y: 3},
      instruction: instructions.JumpInstruction.instructionName,
    }
  ],
  camera: {
    verticalAxisRotation: deg2rad * 0,
    horizontalAxisRotation: deg2rad * 64.6,
  }
};

const waterfallStairs = {
  map: {
    "map": [
      [_h(),_h(),_h(),_h(),{"h":"13","t":"b"},{"h":"14","t":"b"},{"h":"15","t":"b"},{"h":"16","t":"b"},{"h":"17","t":"b"},_h()],
      [_h(),_h(),_h(),_h(),{"h":"12","t":"l"},_h(),_h(),_h(),_h(),_h()],
      [_h(),_h(),_h(),_h(),{"h":"11","t":"l"},_h(),_h(),_h(),_h(),_h()],
      [{"h":pillar,"t":"b"},_h(),_h(),_h(),{"h":"10","t":"l"},_h(),_h(),_h(),_h(),_h()],
      [{"h":"5","t":"b"},{"h":"6","t":"b"},{"h":"7","t":"b"},{"h":"8","t":"b"},{"h":"9","t":"b"},_h(),_h(),_h(),_h(),_h()],
      [{"h":"4","t":"l"},_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h()],
      [{"h":"3","t":"b"},_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h()],
      [{"h":"2","t":"l"},_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h()],
      [{"h":"1","t":"b"},{"h":pillar,"t":"b"},_h(),_h(),_h(), _h(),_h(),_h(),_h(),_h()],
      [{"h":"1","t":"b"},_h(),_h(),_h(),_h(), _h(),_h(),_h(),_h(),_h()],
    ],
    "direction": 2,
    "position": {"x": 0, "y": 0}
  },
  program: {
    main: ['walk', 'process1', 'turnRight', 'process1', 'turnLeft', 'process1', 'turnRight', 'process1', 'turnRight', 'jump', 'turnRight', 'turnRight'],
    process1: ['jump', 'light', 'jump', 'jump', 'light', 'jump'],
  },
  warps: [
    {
      curr: {x: 8, y: 9},
      next: {x: 0, y: 0},
      instruction: instructions.JumpInstruction.instructionName,
    }
  ],
};

const waterfallFlat = {
  map: {
    "map": [
      [_h(),_h(),_h(),_h(),{"h":"1","t":"b"},{"h":"1","t":"l"},{"h":"1","t":"b"},{"h":"1","t":"l"},{"h":"1","t":"b"},_h()],
      [_h(),_h(),_h(),_h(),{"h":"1","t":"l"},_h(),_h(),_h(),_h(),_h()],
      [_h(),_h(),_h(),_h(),{"h":"1","t":"b"},_h(),_h(),_h(),_h(),_h()],
      [{"h":pillar,"t":"l"},_h(),_h(),_h(),{"h":"1","t":"l"},_h(),_h(),_h(),_h(),_h()],
      [{"h":"1","t":"b"},{"h":"1","t":"l"},{"h":"1","t":"b"},{"h":"1","t":"l"},{"h":"1","t":"b"},_h(),_h(),_h(),_h(),_h()],
      [{"h":"1","t":"l"},_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h()],
      [{"h":"1","t":"b"},_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h()],
      [{"h":"1","t":"l"},_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h(),_h()],
      [{"h":"1","t":"b"},{"h":pillar,"t":"l"},_h(),_h(),_h(), _h(),_h(),_h(),_h(),_h()],
      [{"h":"1","t":"b"},_h(),_h(),_h(),_h(), _h(),_h(),_h(),_h(),_h()],
    ],
    "direction": 2,
    "position": {"x": 0, "y": 0}
  },
  program: {
    main: ['process2'],
    process1: ['walk', 'light', 'walk', 'walk', 'light', 'walk'],
    process2: ['walk', 'process1', 'turnRight', 'process1', 'turnLeft', 'process1', 'turnRight', 'process1', 'turnRight', 'jump', 'turnRight', 'turnRight', 'process2'],
  },
  warps: [
    {
      curr: {x: 8, y: 9},
      next: {x: 0, y: 0},
      instruction: instructions.JumpInstruction.instructionName,
    }
  ],
};


const basic = {
  map: mapData[8],
  program: {
    main: ['process1', 'turnLeft', 'jump', 'turnLeft', 'process1', 'turnRight', 'jump', 'turnRight', 'process1'],
    process1: ['walk', 'walk', 'walk', 'light'],
  },
};

// for testing the final jump
// waterfallFlat.program = {main: ['jump']};
// waterfallFlat.map.direction = 0;
// waterfallFlat.map.position = {x: 8, y: 9};


addPlugin('LightbotPromo', trialErrorHandling(async function (root, trial) {
  // let config = waterfallStairs;
  // let config = waterfallFlat;
  let config = stairs;
  // let config = basic;

    const {editor, data} = Editor.newEditorWithAnalytics(root, {
        map: config.map,
        editable: false,
        onComplete() {
          g.onStep(null);
        },
    });
    editor.setProgram(config.program);

    const g = editor.game;

    // disable flourish and background
    g.flourish = {draw(){},step(){},activate(){}};
    g.bg = 'white';

    const bot = g.bot;
    g.onStep = (instruction) => {
      for (const el of document.querySelectorAll('.simple-glow')) {
        el.classList.remove('simple-glow');
      }
      if (!instruction || !instruction.source) {
        return;
      }
      const s = instruction.source;
      const inst = s.parent.el.querySelectorAll('.InstructionList-instruction')[s.index];
      inst.classList.add('simple-glow');
    };

    // For pillar domains, we draw pillars before everything else.
    g.onPreDrawMap = function() {
      for (const pillar of pillars) {
        basicBoxDraw.call(pillar, this.ctx, this.projection);
      }
    };

    /*
    Warps are a slightly complicated feature. The perspective tricks we
    use are entirely based on camera angle. These warps let us connect
    two locations that only appear connected based on camera. We do this
    in a manual way by overriding executeNextInstruction for warps.
    This gets tricky when warps don't animate well, so we permit the
    specification of a final position that should be set after the
    animation completes. This was important for a case where
    there is a visual jump up, which technically was a jump down.
    Didn't seem straightforward to fix this by playing around with animations
    so we instead have 1) an invisible block that we can animate to
    nicely, and 2) set the final position to the visible block that is
    important for the next step.
    */
    const step = bot.step;
    bot.step = function() {
      const rv = step.call(this);
      if (recentWarp && this.readyForNextInstruction) {
        if (recentWarp.finalPos) {
          this.currentPos = {...recentWarp.finalPos};
        }
        recentWarp = null;
      }
      return rv;
    };
    let recentWarp;
    const executeNextInstruction = bot.executeNextInstruction;
    bot.executeNextInstruction = function() {
      recentWarp = null;
      const p = this.currentPos;
      for (const warp of config.warps || []) {
        if (
          warp.curr.x == p.x && warp.curr.y == p.y &&
          warp.instruction == this.executionQueue[0].name
        ) {
          Object.assign(p, warp.next);
          recentWarp = warp;
          return this.executionQueue.shift();
        }
      }
      return executeNextInstruction.call(this);
    };

    const pillars = [];
    let oldBoxDraw = g.map.mapRef[0][0].draw;
    function basicBoxDraw(ctx, projection) {
      oldBoxDraw.call(this, ctx, projection);
      this.shadingAlphaFromDepth = 1;
      this.drawTopFace(ctx, projection);
      this.drawFrontFace(ctx, projection);
      this.drawSideFace(ctx, projection);
    }
    function boxDraw(ctx, projection) {
      const box = this;
      const pp = {
        viewQuadrant: projection.viewQuadrant,
        projectNormalizedZ() { return 0; },
        project(x, y, z) {
          // We use this to render floating blocks instead of columns that come from 0
          if (y == 0) {
            const scale = box.getHeight() / box.height;
            let bottom = box.height == 1 ? 0 : (box.getHeight() - 2 * scale);
            y = bottom * box.getEdgeLength();
          }
          return projection.project(x, y, z)
        },
      }
      basicBoxDraw.call(this, ctx, pp);
    }
    for (const boxes of g.map.mapRef) {
      for (const box of boxes) {
        if (box.height == pillar) {
          pillars.push(box);
          box.draw = function() {};
        } else if (box.height == hide) {
          box.draw = function() {};
        } else if (box.height < 0) {
          // This is a weird case -- we hide negative boxes, but flip their height coordinate.
          // This lets us position non-visible boxes to make smoother animations for escher
          console.log(box.height);
          box.height = -box.height;
          box.draw = function() {};
        } else {
          box.draw = boxDraw;
        }
      }
    }
    const c = g.cameraControls;
    if (config.camera) {
      c.animate(config.camera, config.camera);
    }

    // CSS tweaks to make screen records of domain + instructions easier -- mostly for maps[8]
    for (const el of document.querySelectorAll('.Editor-instructions .InstructionList')) {
      el.style.height = 'var(--instruction-list-height)';
    }
    for (const el of document.querySelectorAll('.Editor-instructions')) {
      el.style.height = 'var(--instruction-list-height)';
    }
    const canvas = document.querySelector('.Editor-canvas');
    canvas.style = `
    z-index: -1;
    top: -36rem;
    right: -16rem;
    `;

    // sample code that waits for bot to finish instructions. Was for idea where camera follows bot.
    // const instructions = ['jump', 'light', 'jump', 'jump', 'light', 'jump', 'turnLeft'].map(i => new instructionsByName[i]());
    // for (let i = 0; i < 5; i++) {
    //   g.bot.queueInstructions(instructions);
    //   g.bot.execute();
    //   await new Promise(r => resolve = r);
    //   c.right();
    //   await setTimeoutPromise(fpsDelay * 20 /* from CameraControls.js */);
    // }
}));
