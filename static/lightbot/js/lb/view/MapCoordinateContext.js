import { invariant, parseHTML } from "../../../../optdisco/js/utils";
import { colorToHex } from "./color";

export class MapCoordinateContext {
  constructor(ctx) {
    this.ctx = ctx;
    this.currentMapLocation = null;
  }

  locationToColor(x, y) {
    /*
    We encode map location to RGB, setting R=x+1 and G=y+1.
    We add one to distinguish from the background, which is
    cleared to transparent black by clearRect.
    */
    return colorToHex([x + 1, y + 1, 0]);
  }
  coordinateToLocation(x, y) {
    const im = this.ctx.getImageData(x, y, 1, 1);
    // Decode map location from RGB, including decrementing.
    const [i, j] = [im.data[0] - 1, im.data[1] - 1];
    if (i == -1 || j == -1) {
      return null;
    } else {
      return [i, j];
    }
  }

  beginPath(...args) {
    invariant(this.currentMapLocation);
    let [x, y] = this.currentMapLocation;
    const c = this.locationToColor(x, y);
    this.ctx.fillStyle = c;
    this.ctx.strokeStyle = c;
    this.ctx.lineWidth = this.lineWidth;
    return this.ctx.beginPath(...args);
  }

  // Pass these on to the original context.
  clearRect(...args) { return this.ctx.clearRect(...args); }
  moveTo(...args) { return this.ctx.moveTo(...args); }
  lineTo(...args) { return this.ctx.lineTo(...args); }
  fill(...args) { return this.ctx.fill(...args); }
  stroke(...args) { return this.ctx.stroke(...args); }

  // These are called during rendering, but can be no-ops.
  fillRect() {}
  drawImage() {}
  createPattern() {}

  static mapLocationFromRelativeCoordinate(game, normx, normy) {
    /*
    To map from a canvas coordinate to a map location, we render the coordinates of locations to an
    in-memory canvas, encoded in colors. We accomplish this using the standard rendering routine, but
    passing in a dummy context that renders using colors from encoded locations.
    */

    invariant(0 <= normx && normx <= 1);
    invariant(0 <= normy && normy <= 1);

    const [w, h] = [game.canvas.width, game.canvas.height];
    // Rendering pixelated is critical for avoiding aliased colors.
    const c = parseHTML(`<canvas width="${w}" height="${h}" style="image-rendering: pixelated;"></canvas>`)

    const originalCtx = game.ctx;
    const mapCoordinateCtx = new MapCoordinateContext(c.getContext('2d'));
    // Temporarily replace the context with one that draws to map coordinate buffer.
    game.ctx = mapCoordinateCtx;
    game.draw();
    game.ctx = originalCtx;

    const sx = Math.round(w * normx);
    const sy = Math.round(h * normy);
    return mapCoordinateCtx.coordinateToLocation(sx, sy);
  }
}
