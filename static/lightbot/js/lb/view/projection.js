import { Box } from '../box';
import './box'; // HACK: need this so box has right prototype

export const startingView = {
  horizontal: 27 / 180 * Math.PI,
  vertical: 45 / 180 * Math.PI,
};

function positiveModulus(num, div) {
  const m = num % div;
  return m < 0 ? m + div : m;
}

// HACK: assumes edgeLength is constant
const edgeLength = Box.prototype.getEdgeLength();
const diagLength = Math.sqrt(2 * Math.pow(edgeLength, 2));

export class Projection {
  constructor(canvasHeight, offsetX, offsetY, mapWidth, mapHeight) {
    this.canvasHeight = canvasHeight;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    this.setRotation(startingView);
  }

  setRotation({ horizontal, vertical }) {
    if (horizontal) {
      this.horizontalAxisRotation = positiveModulus(horizontal, Math.PI * 2);
    }
    if (vertical) {
      this.verticalAxisRotation = positiveModulus(vertical, Math.PI * 2);
    }
    this._updateProjection();
  }

  _updateProjection() {
    const alpha = this.horizontalAxisRotation;
    const beta = this.verticalAxisRotation;

    const sinAlpha = Math.sin(alpha);
    const cosAlpha = Math.cos(alpha);
    const sinBeta = Math.sin(beta);
    const cosBeta = Math.cos(beta);
    this.projection = [
      [cosBeta, 0, -sinBeta],
      [sinAlpha * sinBeta, cosAlpha, sinAlpha * cosBeta],
      [cosAlpha * sinBeta, -sinAlpha, cosAlpha * cosBeta],
    ];

    this.viewQuadrant = Math.floor(this.verticalAxisRotation / (Math.PI / 2));
  }

  project(x, y, z, includeZ) {
    /*
      Math: http://en.wikipedia.org/wiki/Isometric_projection#Overview
      More Theory: http://www.compuphase.com/axometr.htm
      Angles used: vertical rotation=45°, horizontal rotation=arctan(0,5)
      projection matrix:
      | 0,707  0     -0,707 |
      | 0,321  0,891  0,321 |
      | 0,630 -0,453  0,630 |
 
      Additional offset!
      Y Axis is inverted.
     */
    x -= edgeLength * this.mapWidth / 2
    z -= edgeLength * this.mapHeight / 2;
    const p = this.projection;
    const rv = {
      x: this.offsetX + p[0][0] * x + p[0][1] * y + p[0][2] * z,
      y: this.canvasHeight - (this.offsetY + p[1][0] * x + p[1][1] * y + p[1][2] * z),
    };
    if (includeZ) {
      // We assume a 45 degree vertical rotation with the diagLength.
      // We also normalize the depth based on a guess at a max from the horizontal rotation.
      // HACK: is there a simpler way to do this? At this point, we're basically computing
      // a distance in map coordinates...
      const depth = Math.cos(this.horizontalAxisRotation) * diagLength * Math.max(this.mapWidth, this.mapHeight);
      rv.z = (p[2][0] * x + p[2][1] * y + p[2][2] * z + depth/2) / depth;
    }
    return rv;
  }
}
