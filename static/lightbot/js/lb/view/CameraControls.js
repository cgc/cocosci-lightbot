import { clip, easeInOutCubic } from "../../../../optdisco/js/utils";
import { startingView } from "./projection";

const frames = 20;
const deg2rad = Math.PI / 180;

export class CameraControls {
  constructor(root, {game}) {
    this.root = root;
    this.game = game;

    this.counter = 0;

    // https://en.wikipedia.org/wiki/Geometric_Shapes_(Unicode_block)
    root.innerHTML = `<div class="CameraControls">
      <div class="CameraControls-up">&#9650;</div>
      <div class="CameraControls-right">&#9658;</div>
      <div class="CameraControls-down">&#9660;</div>
      <div class="CameraControls-left">&#9658;</div>
      <div class="CameraControls-reset"></div>
    </div>
    `;

    root.querySelector('.CameraControls-left').addEventListener('click', (e) => {
      this.left();
    });
    root.querySelector('.CameraControls-right').addEventListener('click', (e) => {
      this.right();
    });
    root.querySelector('.CameraControls-up').addEventListener('click', (e) => {
      this.up();
    });
    root.querySelector('.CameraControls-down').addEventListener('click', (e) => {
      this.down();
    });
    root.querySelector('.CameraControls-reset').addEventListener('click', (e) => {
      this.reset();
    });
  }

  left() {
    const {verticalAxisRotation, horizontalAxisRotation} = this.game.projection;
    this.animate(
      {verticalAxisRotation, horizontalAxisRotation},
      {verticalAxisRotation: verticalAxisRotation + Math.PI/2, horizontalAxisRotation},
    );
  }

  right() {
    const {verticalAxisRotation, horizontalAxisRotation} = this.game.projection;
    this.animate(
      {verticalAxisRotation, horizontalAxisRotation},
      {verticalAxisRotation: verticalAxisRotation - Math.PI/2, horizontalAxisRotation},
    );
  }

  _animateHorizontal(delta) {
    const {verticalAxisRotation, horizontalAxisRotation} = this.game.projection;
    this.animate(
      {verticalAxisRotation, horizontalAxisRotation},
      {verticalAxisRotation, horizontalAxisRotation: clip(horizontalAxisRotation + delta, 20 * deg2rad, 50 * deg2rad)},
    );
  }

  up() {
    this._animateHorizontal(15 * deg2rad);
  }

  down() {
    this._animateHorizontal(-15 * deg2rad);
  }

  reset() {
    const {verticalAxisRotation, horizontalAxisRotation} = this.game.projection;
    this.animate(
      {verticalAxisRotation, horizontalAxisRotation},
      {
        verticalAxisRotation: Math.abs(verticalAxisRotation - startingView.vertical) < 180 * deg2rad ? startingView.vertical : startingView.vertical + 360 * deg2rad,
        horizontalAxisRotation: startingView.horizontal,
      },
    );
    this.root.querySelector('.CameraControls-reset').innerText = '';
  }

  isAnimating() {
    return this.counter != 0;
  }

  animate(prev, curr) {
    if (this.isAnimating()) {
      return;
    }
    this.counter = frames;
    this.prev = prev;
    this.curr = curr;
    this.root.querySelector('.CameraControls-reset').innerHTML = 'back';
  }

  step() {
    if (!this.isAnimating()) {
      return;
    }
    this.counter--;

    const alpha = easeInOutCubic(1 - this.counter / frames);
    this.game.projection.setRotation({
      vertical: (1 - alpha) * this.prev.verticalAxisRotation + alpha * this.curr.verticalAxisRotation,
      horizontal: (1 - alpha) * this.prev.horizontalAxisRotation + alpha * this.curr.horizontalAxisRotation,
    });
  }
}
