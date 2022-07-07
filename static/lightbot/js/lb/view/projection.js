import { Box } from '../box';
import './box'; // HACK: need this so box has right prototype

export const startingView = {
  horizontal: 35 / 180 * Math.PI,
  vertical: 45 / 180 * Math.PI,
};

function positiveModulus(num, div) {
  const m = num % div;
  return m < 0 ? m + div : m;
}

// HACK: assumes edgeLength is constant
const edgeLength = Box.prototype.getEdgeLength();
const diagLength = Math.sqrt(2 * Math.pow(edgeLength, 2));

function dot(p, x, y, z) {
  // A simple dot product between two vectors: one as array, the other as arguments
  return p[0] * x + p[1] * y + p[2] * z;
}

export class Projection {
  constructor(canvasHeight, offsetX, offsetY, mapWidth, mapHeight, mapMaxBoxHeight) {
    this.canvasHeight = canvasHeight;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    // This is the max height of any box
    this.mapMaxBoxHeight = mapMaxBoxHeight;
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

    // Compute the projection matrix. Named to be consistent with http://en.wikipedia.org/wiki/Isometric_projection#Overview
    this.projection = [
      [cosBeta, 0, -sinBeta],
      [sinAlpha * sinBeta, cosAlpha, sinAlpha * cosBeta],
      [cosAlpha * sinBeta, -sinAlpha, cosAlpha * cosBeta],
    ];

    // Compute an extent for Z based on a bounding box of the environment.
    const [x, y, z] = [this.mapWidth - 1, this.mapMaxBoxHeight, this.mapHeight - 1];
    const zs = [
      dot(this.projection[2], 0, 0, 0),
      dot(this.projection[2], x, 0, 0),
      dot(this.projection[2], 0, y, 0),
      dot(this.projection[2], x, y, 0),
      dot(this.projection[2], 0, 0, z),
      dot(this.projection[2], x, 0, z),
      dot(this.projection[2], 0, y, z),
      dot(this.projection[2], x, y, z),
    ];
    this.zExtent = [Math.min(...zs), Math.max(...zs)];

    // Compute the current view quadrant.
    // Used to inform view-dependence in box order, box faces, and sprite orientation.
    this.viewQuadrant = Math.floor(this.verticalAxisRotation / (Math.PI / 2));
  }

  projectNormalizedZ(x, y, z) {
    /*
    This computes and returns a normalized depth from camera, ignoring horizontal rotation.
    It takes map coordinates as input (as opposed to proper world space coordinates) and
    returns a normalized Z, based on the extent of the bounding box.
    */
    const [min, max] = this.zExtent;
    const p = this.projection[2];
    const v = p[0] * x + p[1] * y + p[2] * z;
    return (v - min) / (max - min);
  }

  project(x, y, z) {
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
    // We center before applying the rotation matrix.
    x -= edgeLength * this.mapWidth / 2
    z -= edgeLength * this.mapHeight / 2;
    const p = this.projection;
    return {
      x: this.offsetX + p[0][0] * x + p[0][1] * y + p[0][2] * z,
      y: this.canvasHeight - (this.offsetY + p[1][0] * x + p[1][1] * y + p[1][2] * z),
    };
  }
}
