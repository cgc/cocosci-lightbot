export class Box {
  constructor(height, x, y) {
    this.height = height;
    this.x = x;
    this.y = y;
  }
  reset() {
    // pass
  }
}

export class LightBox extends Box {
  constructor(height, x, y) {
    super(height, x, y);
    this.lightOn = false;
  }
  toggleLight() {
    this.lightOn = !this.lightOn;
  }
  reset() {
    this.lightOn = false;
  }
}
