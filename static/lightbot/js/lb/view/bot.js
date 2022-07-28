import { loadImage } from "../../../../optdisco/js/utils";
import instructions from "../instructions";
import { Bot } from "../bot";

export const spritePromise = loadImage(new URL('../../../images/sprites.png', import.meta.url));

let sprites;
spritePromise.then(s => {
  sprites = s;
})

const botView = {
  initView() {
    // bot state
    this.readyForNextInstruction = true;

    // bot animation
    this.currentStep = 0; // # of frames since animation started
    this.currentFrame = 0; // current animation frame
    this.animation = animations.stand; // current animation
    this.movement = { dX: 0, dY: 0, dZ: 0 }; // controls bot movement during animations
  },

  animate(instruction, oldPos, newPos) {
    // set the bot to busy
    this.readyForNextInstruction = false;

    // Hold onto ref to old position
    this.prevPos = oldPos;

    // decide what to animate
    switch (instruction.name) {
      // walk
      case instructions.WalkInstruction.instructionName:
        this.setAnimation(animations.walk);
        this.setMovement((oldPos.x - newPos.x) * this.map.mapRef[oldPos.x][oldPos.y].getEdgeLength(), 0, (oldPos.y - newPos.y) * this.map.mapRef[oldPos.x][oldPos.y].getEdgeLength());
        break;
      // jump
      case instructions.JumpInstruction.instructionName:
        var heightDiff = (this.map.mapRef[newPos.x][newPos.y].getHeight() - this.map.mapRef[oldPos.x][oldPos.y].getHeight()) * this.map.mapRef[newPos.x][newPos.y].getEdgeLength();
        if (heightDiff > 0) {
          this.setAnimation(animations.jumpUp);
        } else if (heightDiff < 0) {
          this.setAnimation(animations.jumpDown);
        } else {
          // here we could implement a special animation if the bot can't jump up
          this.setAnimation(animations.jumpUp);
        }
        this.setMovement((oldPos.x - newPos.x) * this.map.mapRef[oldPos.x][oldPos.y].getEdgeLength(), heightDiff, (oldPos.y - newPos.y) * this.map.mapRef[oldPos.x][oldPos.y].getEdgeLength());
        break;
      // light
      case instructions.LightInstruction.instructionName:
        this.setAnimation(animations.light);
        break;
      // turn left, turn right, repeat, process1, process2
      case instructions.TurnLeftInstruction.instructionName:
      case instructions.TurnRightInstruction.instructionName:
      case instructions.RepeatInstruction.instructionName:
      case instructions.Process1Instruction.instructionName:
      case instructions.Process2Instruction.instructionName:
      case instructions.Process3Instruction.instructionName:
      case instructions.Process4Instruction.instructionName:
        // no animation for turning
        break;
      default:
        console.error('bot view animate: unknown animation "' + instruction.name + '"');
        break;
    }
  },

  step() {
    if (this.currentStep >= this.animation.duration || !this.isInExecutionMode()) {
      // set the bot to ready
      this.readyForNextInstruction = true;

      // set new animation
      this.setAnimation(animations.stand);
      this.setMovement(0, 0, 0);

      // clear prev
      this.prevPos = null;

    } else {
      var nbrFrame = Math.floor(this.currentStep / this.animation.step);
      if (this.animation.loop) {
        if (this.animation.name === 'walk') {
          // walk has special rule since order of frames is 0, 1, 2, 1, 2, 1, 2 ...
          if (nbrFrame < this.animation.totalFrames) {
            this.currentFrame = nbrFrame % (this.animation.totalFrames);
          } else {
            this.currentFrame = (nbrFrame + 1) % (this.animation.totalFrames - 1) + 1;
          }
        } else {
          this.currentFrame = nbrFrame % this.animation.totalFrames;
        }
      } else {
        this.currentFrame = Math.min(nbrFrame, this.animation.totalFrames - 1);
      }
      this.currentStep++;
    }
  },

  getMovementOffset() {
    var offset = {
      x: this.currentStep / this.animation.duration * this.movement.dX,
      y: this.currentStep / this.animation.duration * this.movement.dY,
      z: this.currentStep / this.animation.duration * this.movement.dZ
    };

    // modify y offset during jump animations for a more natural movement
    if (this.animation.name === "jumpUp") {
      // jump up y movement is defined by f(x) = x^0.3 from 0 to 1: http://www.wolframalpha.com/input/?i=x%5E0.3+from+0+to+1
      offset.y = Math.pow(this.currentStep / this.animation.duration, 0.3) * this.movement.dY;
    }
    if (this.animation.name === "jumpDown") {
      // jump down y movement is defined by f(x) = x^4 from 0 to 1: http://www.wolframalpha.com/input/?i=f%28x%29+%3D+x%5E4+from+0+to+1
      offset.y = Math.pow(this.currentStep / this.animation.duration, 4) * this.movement.dY;
    }
    return offset;
  },

  projectedDirection(projection) {
    return (this.direction + projection.viewQuadrant) % 4;
  },

  draw(ctx, projection) {
    var offset = this.getMovementOffset();

    // This would previously render sprites at the box corner, and the image margin would make things look alright.
    // I've adapted it to render to the box center, and remove the bottom image's margin.
    const curr = this.map.mapRef[this.currentPos.x][this.currentPos.y];
    var p = projection.project(
      (this.currentPos.x + 0.5) * curr.getEdgeLength() + (this.movement.dX - offset.x),
      curr.getHeight() * curr.getEdgeLength() + (-this.movement.dY + offset.y),
      (this.currentPos.y + 0.5) * curr.getEdgeLength() + (this.movement.dZ - offset.z));
    var srcX = this.animation.sX + this.currentFrame * this.animation.width;
    var srcY = this.projectedDirection(projection) * this.animation.height;
    var dX = p.x - this.animation.width / 2; // center image horizontally
    // .86 just looked right -- seems to remove the margin for most of the sprites.
    var dY = p.y - this.animation.height * .86;

    // round dX and dY down to avoid anti-aliasing when drawing the sprite
    ctx.drawImage(sprites, srcX, srcY, this.animation.width, this.animation.height, Math.floor(dX), Math.floor(dY), this.animation.width, this.animation.height);
  },

  drawPath(ctx, projection) {
    let prev = this.trajectory[0];
    for (const curr of this.trajectory.slice(1)) {
      const {position: prevPosition, direction: prevDirection} = prev;
      const {position, direction} = curr;

      const box = this.map.mapRef[position.x][position.y];
      const prevBox = this.map.mapRef[prevPosition.x][prevPosition.y];

      const p = box => projection.project(
        (box.x + 0.5) * box.getEdgeLength(),
        box.getHeight() * box.getEdgeLength(),
        (box.y + 0.5) * box.getEdgeLength());

      const p1 = p(prevBox);
      const p2 = p(box);

      ctx.strokeStyle = 'rgb(7, 192, 195)';
      //ctx.strokeStyle = 'rgb(241, 202, 25)';
      ctx.beginPath();
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      prev = curr;
    }
  },

  setAnimation(a) {
    this.animation = a;
    this.currentStep = 0;
    this.currentFrame = 0;
  },

  getAnimation() {
    return this.animation;
  },

  getCurrentStep() {
    return this.currentStep;
  },

  getMovement() {
    return this.movement;
  },

  setMovement(dX, dY, dZ) {
    this.movement.dX = dX;
    this.movement.dY = dY;
    this.movement.dZ = dZ;
  },

  isReadyForNextInstruction() {
    return this.readyForNextInstruction;
  },
};

Object.assign(Bot.prototype, botView);




export const animations = {
  stand: {
    name: 'stand',
    loop: false, // set to true for animation to loop automatically
    totalFrames: 1, // # of images in the animation
    step: 10, // # of frames before animation advances - controls animation speed
    duration: 10, // # of steps the entire animation lasts. stand.duration defines the idle time after turn instructions. for non-looping animations, if the duration is larger than (totalFrames * step), the last frame is displayed until the end.
    width: 80,
    height: 100, // should be same for every animation
    sX: 0  // X offset for where animation is located in source file
  },
  walk: {
    name: 'walk',
    loop: true,
    totalFrames: 3,
    step: 5,
    duration: 20,
    width: 80,
    height: 100,
    sX: 80
  },
  light: {
    name: 'light',
    loop: true,
    totalFrames: 2,
    step: 3,
    duration: 20,
    width: 80,
    height: 100,
    sX: 480
  },
  jumpUp: {
    name: 'jumpUp',
    loop: false,
    totalFrames: 1,
    step: 15,
    duration: 15,
    width: 80,
    height: 100,
    sX: 320
  },
  jumpDown: {
    name: 'jumpDown',
    loop: false,
    totalFrames: 1,
    step: 15,
    duration: 15,
    width: 80,
    height: 100,
    sX: 400
  }
};

// Code for making animations shorter
for (const entry of Object.values(animations)) {
  entry.duration = Math.round(entry.duration * .75);
}
