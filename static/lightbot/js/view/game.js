import { invariant, loadImage } from "../../../optdisco/js/utils";
import { directions } from "../constants";
import { Projection } from "./projection";

// They modify models in parent directory, so have to call them.
import './box';
import './bot';

// refresh rate
const fps = 30;
const fpsDelay = 1000 / fps;

// distance between lowest point in the map and the bottom edge
const offsetY = 65;

const bgTilePromise = loadImage(new URL('../../images/pattern.png', import.meta.url));

export class Game {
  constructor(canvas, bot, onComplete) {
    this.canvas = canvas;
    this.onComplete = onComplete;
    this.executing = false;

    this.bot = bot;
    invariant(this.bot);
    this.map = bot.map;
    invariant(this.map);

    // set the rendering context
    this.ctx = this.canvas.getContext('2d');

    // create projection
    this.projection = new Projection(this.canvas.height, this.canvas.width / 2, offsetY);

    // create this.canvas background pattern
    bgTilePromise.then(bgTile => {
      this.bg = this.ctx.createPattern(bgTile, 'repeat');
    });

    window.setTimeout(this.update, fpsDelay) // HACK: for first loop b/c avoiding loading???? xxx
  }

  execute(instructions) {
    this.executing = true;
    this.bot.queueInstructions(instructions);
    this.bot.execute();
  }

  update = () => {
    // rendering loop
    this.timeoutId = window.setTimeout(this.update, fpsDelay);

    // check if we can execute the next bot instruction here?
    if (this.bot.isInExecutionMode() && this.bot.isReadyForNextInstruction() && this.bot.hasNextInstruction()) {
      var oldPos = {...this.bot.currentPos}; // copy old position
      var instruction = this.bot.executeNextInstruction(); // execute the next instruction
      var newPos = this.bot.currentPos; // get the new position
      this.bot.animate(instruction, oldPos, newPos);
    }
    // check if map has been completed here
    if (this.executing && this.map.allLightsOn()) {

      // stop the bot
      this.bot.clearExecutionQueue();
      //this.bot.executionMode = false; // HACK, this will halt last animation
      this.executing = false;

      /*
      // // award medals
      var medal = lightBot.medals.awardMedal();
      lightBot.medals.display(medal); // show medal dialog
      */

      // award achievements
      // var achievements = lightBot.achievements.awardAchievements();
      // lightBot.achievements.display(achievements);

      // stop the loop -> actually that halts animations (both tiles, but also final motion)
      //window.clearTimeout(this.timeoutId);

      // HACK HACK CHANGE
      // HACK HACK CHANGE
      // HACK HACK CHANGE
      // HACK HACK CHANGE
      // set the map as complete
      this.onComplete();

      // return to map selection screen
    }
    this.step();
    this.draw();
  }

  reset() {
    this.bot.reset();
    this.map.reset();
  }

  step() {
    this.bot.step();
    this.map.step();
  }

  draw() {
    //clear main this.canvas
    this.ctx.clearRect(0,0, this.canvas.width, this.canvas.height);

    // background
    this.ctx.fillStyle = this.bg;
    this.ctx.fillRect(0,0, this.canvas.width, this.canvas.height);

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
              case this.bot.animations.jumpUp.name:
              case this.bot.animations.jumpDown.name:
                if (this.bot.getMovement().dZ !== 0 && this.bot.getCurrentStep() / this.bot.getAnimation().duration <= 0.5) {
                  if (this.bot.currentPos.x === i && this.bot.currentPos.y === j+1) {
                    this.bot.draw(this.ctx, this.projection);
                  }
                } else {
                  if (this.bot.currentPos.x === i && this.bot.currentPos.y === j) {
                    this.bot.draw(this.ctx, this.projection);
                  }
                }
                break;
              case this.bot.animations.walk.name:
                if (this.bot.getMovement().dZ !== 0 && this.bot.currentPos.x === i && this.bot.currentPos.y === j+1) {
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
              case this.bot.animations.jumpUp.name:
              case this.bot.animations.jumpDown.name:
                if (this.bot.getMovement().dX !== 0 && this.bot.getCurrentStep() / this.bot.getAnimation().duration <= 0.5) {
                  if (this.bot.currentPos.x === j+1 && this.bot.currentPos.y === i) {
                    this.bot.draw(this.ctx, this.projection);
                  }
                } else {
                  if (this.bot.currentPos.x === j && this.bot.currentPos.y === i) {
                    this.bot.draw(this.ctx, this.projection);
                  }
                }
                break;
              case this.bot.animations.walk.name:
                if (this.bot.getMovement().dX !== 0 && this.bot.currentPos.x === j+1 && this.bot.currentPos.y === i) {
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

  }
}
