import { clip } from "../../../../optdisco/js/utils";
import { Box, LightBox } from "../box";
import { colorToHex, parseHexColor, rgbBlend } from "./color";

// dimension
const edgeLength = 35;
const heightScale = 0.5;

// visual values
const colorTop = parseHexColor("#c9d3d9"); //#ffa605"; // color of top face
const colorFront = parseHexColor("#adb8bd"); // "#e28b00"; // color of front face
const colorSide = parseHexColor("#e5f0f5"); // "#ffc133"; // color of side face
const strokeColor = "#485256"; // color of the stroke
const strokeWidth = 0.5; // width of the stroke
const black = [0, 0, 0];

// visual values (lightBox)
const colorTopLightOn = "#FFE545"; // "#e3e500";
const colorTopLightOnOverlay = "#FEFBAF"; // "#ffff7c";
const colorTopLightOff = "#0468fb";
const colorTopLightOffOverlay = "#4c81ff";

// pulse values (pulse is the lighter color in the middle of the top face)
const pulseSize = 0.5; // this represents the minimum percentage of surface that will be covered (0=disappears completely,1=always entire face), same for all lightboxes
export const animationFrames = 30; // # of frames for the pulse to fully grow/shrink, same for all lightboxes

LightBox.prototype.pulseGrowing = true; // controls the growth/shrink of the pulse animation
LightBox.prototype.currentAnimationFrame = 0; // current animation frame, used internally to control the animation

function drawTopFaceBox(ctx, projection) {
  ctx.fillStyle = colorToHex(rgbBlend(colorTop, black, this.shadingAlphaFromDepth));
  // top face: p1 is front left and rest is counter-clockwise
  var p1 = projection.project(this.x * edgeLength, this.getHeight() * edgeLength, this.y * edgeLength);
  var p2 = projection.project((this.x + 1) * edgeLength, this.getHeight() * edgeLength, this.y * edgeLength);
  var p3 = projection.project((this.x + 1) * edgeLength, this.getHeight() * edgeLength, (this.y + 1) * edgeLength);
  var p4 = projection.project(this.x * edgeLength, this.getHeight() * edgeLength, (this.y + 1) * edgeLength);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.fill();
  ctx.stroke();
}

function drawTopFaceLightBox(ctx, projection) {
  // top face: p1 is front left and rest is counter-clockwise
  ctx.fillStyle = this.lightOn ? colorTopLightOn : colorTopLightOff;
  var p1 = projection.project(this.x * edgeLength, this.getHeight() * edgeLength, this.y * edgeLength);
  var p2 = projection.project((this.x + 1) * edgeLength, this.getHeight() * edgeLength, this.y * edgeLength);
  var p3 = projection.project((this.x + 1) * edgeLength, this.getHeight() * edgeLength, (this.y + 1) * edgeLength);
  var p4 = projection.project(this.x * edgeLength, this.getHeight() * edgeLength, (this.y + 1) * edgeLength);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.fill();
  ctx.stroke();

  // top face overlay: p1 is front left and rest is counter-clockwise
  var overlayOffset = (1 - (this.currentAnimationFrame / animationFrames)) * ((1 - pulseSize) * edgeLength / 2);
  ctx.fillStyle = this.lightOn ? colorTopLightOnOverlay : colorTopLightOffOverlay;
  p1 = projection.project(this.x * edgeLength + overlayOffset, this.getHeight() * edgeLength, this.y * edgeLength + overlayOffset);
  p2 = projection.project((this.x + 1) * edgeLength - overlayOffset, this.getHeight() * edgeLength, this.y * edgeLength + overlayOffset);
  p3 = projection.project((this.x + 1) * edgeLength - overlayOffset, this.getHeight() * edgeLength, (this.y + 1) * edgeLength - overlayOffset);
  p4 = projection.project(this.x * edgeLength + overlayOffset, this.getHeight() * edgeLength, (this.y + 1) * edgeLength - overlayOffset);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.fill();
}

function drawFrontFaceBox(ctx, projection) {
  // To allow multiple viewpoints, we change the side of this face based on the current view quadrant.
  const yoffset = projection.viewQuadrant == 1 || projection.viewQuadrant == 2 ? +1 : 0;
  const y = (this.y + yoffset) * edgeLength;

  // front face: p1 is bottom left and rest is counter-clockwise;
  ctx.fillStyle = colorToHex(rgbBlend(colorFront, black, this.shadingAlphaFromDepth));
  var p1 = projection.project(this.x * edgeLength, 0, y);
  var p2 = projection.project((this.x + 1) * edgeLength, 0, y);
  var p3 = projection.project((this.x + 1) * edgeLength, this.getHeight() * edgeLength, y);
  var p4 = projection.project(this.x * edgeLength, this.getHeight() * edgeLength, y);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.fill();
  ctx.stroke();
}

function drawSideFaceBox(ctx, projection) {
  // To allow multiple viewpoints, we change the side of this face based on the current view quadrant.
  const xoffset = projection.viewQuadrant >= 2 ? +1 : 0;
  const x = (this.x + xoffset) * edgeLength;

  // left side face: p1 is bottom front and rest is counter-clockwise;
  ctx.fillStyle = colorToHex(rgbBlend(colorSide, black, this.shadingAlphaFromDepth));
  var p1 = projection.project(x, 0, this.y * edgeLength);
  var p2 = projection.project(x, this.getHeight() * edgeLength, this.y * edgeLength);
  var p3 = projection.project(x, this.getHeight() * edgeLength, (this.y + 1) * edgeLength);
  var p4 = projection.project(x, 0, (this.y + 1) * edgeLength);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.lineTo(p3.x, p3.y);
  ctx.lineTo(p4.x, p4.y);
  ctx.lineTo(p1.x, p1.y);
  ctx.fill();
  ctx.stroke();
}

function stepBox() { }

function stepLightBox() {
  if (this.pulseGrowing) {
    if (this.currentAnimationFrame + 1 >= animationFrames) { // stop 1 frame early to avoid overlap with stroke
      this.pulseGrowing = false;
    } else {
      this.currentAnimationFrame++;
    }
  } else {
    if (this.currentAnimationFrame <= 0) {
      this.pulseGrowing = true;
    } else {
      this.currentAnimationFrame--;
    }
  }
}

function draw(ctx, projection) {
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = strokeWidth;

  const z = projection.projectNormalizedZ(this.x, this.getHeight(), this.y);
  this.shadingAlphaFromDepth = clip(1.05 - 0.3 * z, 0, 1);

  this.drawTopFace(ctx, projection);
  this.drawFrontFace(ctx, projection);
  this.drawSideFace(ctx, projection);
}

// add getHeight method and only use getHeight in view
function getHeight() {
  return this.height * heightScale;
}

function getEdgeLength() {
  return edgeLength;
}

Box.prototype.step = stepBox;
Box.prototype.drawTopFace = drawTopFaceBox;
Box.prototype.drawFrontFace = drawFrontFaceBox;
Box.prototype.drawSideFace = drawSideFaceBox;
Box.prototype.draw = draw;
Box.prototype.getHeight = getHeight;
Box.prototype.getEdgeLength = getEdgeLength;

LightBox.prototype.step = stepLightBox;
LightBox.prototype.drawTopFace = drawTopFaceLightBox;
