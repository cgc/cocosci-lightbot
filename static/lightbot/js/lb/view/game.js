import { invariant, loadImage, QUERY } from "../../../../optdisco/js/utils";
import { directions } from "../constants";
import { Projection } from "./projection";

// They modify models in parent directory, so have to call them.
import './box';
import { animations, spritePromise } from "./bot";
import { Flourish } from "./flourish";
import { RAF } from "./raf";
import { MapCoordinateContext } from "./MapCoordinateContext";

// refresh rate
const fps = parseInt(QUERY.get('fps') || 30, 10);
const fpsDelay = 1000 / fps;

// distance between lowest point in the map and the bottom edge
const offsetY = 150;

const drawTrajectory = QUERY.get('drawTrajectory');

const bgTilePromise = loadImage(new URL('../../../images/pattern.png', import.meta.url));
let bgTile;
bgTilePromise.then(b => {
  bgTile = b;
});

export const assetsLoaded = Promise.all([bgTilePromise, spritePromise]);

export class Game {
  constructor(canvas, bot, { onComplete, onStep, onPreDrawMap }) {
    this.canvas = canvas;
    this.onComplete = onComplete;
    this.onStep = onStep;
    this.onPreDrawMap = onPreDrawMap;

    this.bot = bot;
    invariant(this.bot);
    this.map = bot.map;
    invariant(this.map);

    // set the rendering context
    this.ctx = this.canvas.getContext('2d');

    // create projection
    this.projection = new Projection(
      this.canvas.height,
      this.canvas.width / 2,
      offsetY,
      this.map.levelSize.x,
      this.map.levelSize.y,
      this.map.maxBoxHeight(),
    );

    // create this.canvas background pattern
    this.bg = this.ctx.createPattern(bgTile, 'repeat');

    this.flourish = new Flourish();

    this.raf = new RAF(fpsDelay, this.update);
  }

  setMapLocation(i, j) {
    if (this.ctx instanceof MapCoordinateContext) {
      this.ctx.currentMapLocation = [i, j];
    }
  }

  state() {
    if (this.bot.executionMode) {
      return 'exec';
    } else if (this.bot.instructionQueue.length) {
      return 'post';
    } else {
      return 'init';
    }
  }

  execute(instructions) {
    this.reset(); // always reset
    this.bot.queueInstructions(instructions);
    this.bot.execute();
  }

  check(instructions) {
    this.reset(); // always reset
    this.bot.queueInstructions(instructions);
    this.bot.execute();
    this.bot.executionMode = false; // HACK

    while (this.bot.hasNextInstruction()) {
      if (this.map.allLightsOn()) {
        this.onComplete(true);
        return
      }
      this.bot.executeNextInstruction();
    }
    // Need to run allLightsOn() here to make sure we catch the state change after last instruction.
    this.onComplete(this.map.allLightsOn());
  }

  setComplete(success) {
    // stop the bot
    this.bot.clearExecutionQueue();
    this.bot.executionMode = false;
    this.onComplete(success);
    if (success) {
      this.flourish.activate();
    }
  }

  stepBot() {
    // check if we can execute the next bot instruction here?
    if (this.bot.isInExecutionMode() && this.bot.isReadyForNextInstruction()) {
      // check if map has been completed here
      // intentionally doing this before we execute the instruction to let last light animation play out.
      if (this.map.allLightsOn()) {
        this.setComplete(true);
        // We avoid clearing the update timeout so that light tiles can continue animating.
      } else if (this.bot.hasNextInstruction()) {
        var oldPos = { ...this.bot.currentPos }; // copy old position
        var instruction = this.bot.executeNextInstruction(); // execute the next instruction
        if (instruction) {
          var newPos = this.bot.currentPos; // get the new position
          this.bot.animate(instruction, oldPos, newPos);
          this.onStep && this.onStep(instruction);
        } else {
          // This is a weird case that can really only happen when you're calling an empty process
          // TODO: consider changing things so we only queue flat programs without processes??
          this.setComplete(false);
        }
      } else {
        // No more instructions left! We call onComplete noting this isn't a success.
        // No need to clear execution queue.
        this.setComplete(false);
      }
    }
  }

  update = () => {
    this.stepBot();
    this.step();
    this.draw();
  }

  destroy() {
    this.raf.stop();
  }

  reset() {
    if (drawTrajectory) {
      // Big hack! We avoid resetting the trajectory since we want to draw it
      const trajectory = this.bot.trajectory;
      this.bot.reset();
      this.bot.trajectory = trajectory;
      this.map.reset();
      return;
    }

    this.bot.reset();
    this.map.reset();
  }

  step() {
    this.cameraControls && this.cameraControls.step();
    this.bot.step();
    this.map.step();
    this.flourish.step();
  }

  draw() {
    /*
    We render boxes using a simple variant of the Painter's Algorithm, drawing boxes in coordinate order from the furthest
    corner from the camera -- this order is hardcoded based on the quadrant the camera is in.

    While general isometric rendering can get complicated (https://shaunlebron.github.io/IsometricBlocks/),
    we have a simple case because tiles and lightbot have a 1x1 footprint. While rendering in coordinate order
    isn't exactly a painter's algorithm, when tiles are 1x1 it has the right effect, rendering from back to front
    at any particular pixel.

    What takes a little care is rendering animations for movements.
    - When walking, lightbot should always be rendered on top of the previous or next location.
    - When jumping, we should be careful when lightbot will be occluded. The two main cases are
      jumping up toward the camera, and jumping down away from the camera. Instead of explicitly
      handling the two cases, I borrow the heuristic previously used, which is to render lightbot
      directly after the previous state during first half of animation and current state during
      second half. This works for most cases, but like previous implementation, lightbot clips
      when jumping down and away.
    */

    //clear main this.canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // background
    this.ctx.fillStyle = this.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.onPreDrawMap && this.onPreDrawMap();

    const quad = this.projection.viewQuadrant;
    for (var i = 0; i < this.map.levelSize.x; i++) {
      for (var j = 0; j < this.map.levelSize.y; j++) {
        let x = i, y = j;

        // First, we adjust indices based on current quadrant to ensure we're rendering from back to front.
        if (quad == 0) {
          x = this.map.levelSize.x - 1 - x;
          y = this.map.levelSize.y - 1 - y;
        } else if (quad == 1) {
          x = this.map.levelSize.x - 1 - x;
        } else if (quad == 3) {
          y = this.map.levelSize.y - 1 - y;
        }

        // We render the box at this location.
        this.setMapLocation(x, y);
        this.map.mapRef[x][y].draw(this.ctx, this.projection);

        // We either render the bot at the current or previous position, depending on conditions.
        const isCurr = this.bot.currentPos.x === x && this.bot.currentPos.y === y;
        const isPrev = this.bot.prevPos && this.bot.prevPos.x === x && this.bot.prevPos.y === y;
        if (isCurr || isPrev) {
          const anim = this.bot.getAnimation().name;
          if (anim == animations.jumpUp.name || anim == animations.jumpDown.name) {
            // For jump up/down, we borrow old logic to animate at prev during first half of animation
            // and next state during second half.
            const firstHalf = this.bot.getCurrentStep() / this.bot.getAnimation().duration <= 0.5;
            if ((firstHalf && isPrev) || (!firstHalf && isCurr)) {
              this.bot.draw(this.ctx, this.projection);
            }
          } else {
            // This case handles other commands.
            // It's important that we draw at both curr & prev for walking.
            this.bot.draw(this.ctx, this.projection);
          }
        }
      }
    }

    this.flourish.draw(this.ctx, this.projection);

    if (drawTrajectory) {
      this.bot.drawPath(this.ctx, this.projection);
    }
  }
}
