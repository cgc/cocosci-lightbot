import { invariant, loadImage } from "../../../../optdisco/js/utils";
import { directions } from "../constants";
import { Projection } from "./projection";

// They modify models in parent directory, so have to call them.
import './box';
import { animations, spritePromise } from "./bot";
import { Flourish } from "./flourish";
import { RAF } from "./raf";

// refresh rate
const fps = 30;
const fpsDelay = 1000 / fps;

// distance between lowest point in the map and the bottom edge
const offsetY = 65;

const bgTilePromise = loadImage(new URL('../../../images/pattern.png', import.meta.url));
let bgTile;
bgTilePromise.then(b => {
  bgTile = b;
});

export const assetsLoaded = Promise.all([bgTilePromise, spritePromise]);

export class Game {
  constructor(canvas, bot, {onComplete, onStep}) {
    this.canvas = canvas;
    this.onComplete = onComplete;
    this.onStep = onStep;

    this.bot = bot;
    invariant(this.bot);
    this.map = bot.map;
    invariant(this.map);

    // set the rendering context
    this.ctx = this.canvas.getContext('2d');

    // create projection
    this.projection = new Projection(this.canvas.height, this.canvas.width / 2, offsetY);

    // create this.canvas background pattern
    this.bg = this.ctx.createPattern(bgTile, 'repeat');

    this.flourish = new Flourish();

    this.raf = new RAF(fpsDelay, this.update);
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
          this.onStep && this.onStep();
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
    this.bot.reset();
    this.map.reset();
  }

  step() {
    this.bot.step();
    this.map.step();
    this.flourish.step();
  }

  draw() {
    //clear main this.canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // background
    this.ctx.fillStyle = this.bg;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // draw the map and the bot in the correct order
    switch (this.bot.direction) {
      case directions.se:
        for (var i = this.map.levelSize.x - 1; i >= 0; i--) {
          for (var j = this.map.levelSize.y - 1; j >= 0; j--) {
            this.map.mapRef[i][j].draw(this.ctx, this.projection);
            if (this.bot.currentPos.x === i && this.bot.currentPos.y === j) {
              this.bot.draw(this.ctx, this.projection);
            }
          }
        }
        break;
      case directions.nw:
        for (i = this.map.levelSize.x - 1; i >= 0; i--) {
          for (j = this.map.levelSize.y - 1; j >= 0; j--) {
            this.map.mapRef[i][j].draw(this.ctx, this.projection);
            switch (this.bot.getAnimation().name) {
              case animations.jumpUp.name:
              case animations.jumpDown.name:
                if (this.bot.getMovement().dZ !== 0 && this.bot.getCurrentStep() / this.bot.getAnimation().duration <= 0.5) {
                  if (this.bot.currentPos.x === i && this.bot.currentPos.y === j + 1) {
                    this.bot.draw(this.ctx, this.projection);
                  }
                } else {
                  if (this.bot.currentPos.x === i && this.bot.currentPos.y === j) {
                    this.bot.draw(this.ctx, this.projection);
                  }
                }
                break;
              case animations.walk.name:
                if (this.bot.getMovement().dZ !== 0 && this.bot.currentPos.x === i && this.bot.currentPos.y === j + 1) {
                  this.bot.draw(this.ctx, this.projection);
                } else if (this.bot.currentPos.x === i && this.bot.currentPos.y === j) {
                  this.bot.draw(this.ctx, this.projection);
                }
                break;
              default:
                if (this.bot.currentPos.x === i && this.bot.currentPos.y === j) {
                  this.bot.draw(this.ctx, this.projection);
                }
                break;
            }
          }
        }
        break;
      case directions.ne:
        for (i = this.map.levelSize.y - 1; i >= 0; i--) {
          for (j = this.map.levelSize.x - 1; j >= 0; j--) {
            this.map.mapRef[j][i].draw(this.ctx, this.projection);
            switch (this.bot.getAnimation().name) {
              case animations.jumpUp.name:
              case animations.jumpDown.name:
                if (this.bot.getMovement().dX !== 0 && this.bot.getCurrentStep() / this.bot.getAnimation().duration <= 0.5) {
                  if (this.bot.currentPos.x === j + 1 && this.bot.currentPos.y === i) {
                    this.bot.draw(this.ctx, this.projection);
                  }
                } else {
                  if (this.bot.currentPos.x === j && this.bot.currentPos.y === i) {
                    this.bot.draw(this.ctx, this.projection);
                  }
                }
                break;
              case animations.walk.name:
                if (this.bot.getMovement().dX !== 0 && this.bot.currentPos.x === j + 1 && this.bot.currentPos.y === i) {
                  this.bot.draw(this.ctx, this.projection);
                } else if (this.bot.currentPos.x === j && this.bot.currentPos.y === i) {
                  this.bot.draw(this.ctx, this.projection);
                }
                break;
              default:
                if (this.bot.currentPos.x === j && this.bot.currentPos.y === i) {
                  this.bot.draw(this.ctx, this.projection);
                }
                break;
            }
          }
        }
        break;
      case directions.sw:
        for (i = this.map.levelSize.y - 1; i >= 0; i--) {
          for (j = this.map.levelSize.x - 1; j >= 0; j--) {
            this.map.mapRef[j][i].draw(this.ctx, this.projection);
            if (this.bot.currentPos.x === j && this.bot.currentPos.y === i) {
              this.bot.draw(this.ctx, this.projection);
            }
          }
        }
        break;
      default:
        console.error('unknown direction "' + this.bot.direction + '"');
        break;
    }

    this.flourish.draw(this.ctx, this.projection);
  }
}
