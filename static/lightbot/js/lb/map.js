import { invariant } from '../../../optdisco/js/utils.js';
import { Box, LightBox } from './box.js';

export class Map {
  constructor(m) {
    const levelSize = this.levelSize = { 'x': 0, 'y': 0 }; // the level size

    // map files are defined user-friendly so we have to adapt to that
    levelSize.x = m.map[0].length; // we suppose map is a rectangle
    levelSize.y = m.map.length;

    const mapRef = this.mapRef = new Array(levelSize.x); // the actual map values
    for (i = 0; i < levelSize.x; i++) {
      mapRef[i] = new Array(levelSize.y);
    }

    var nbrLights = 0;

    for (var i = 0; i < m.map.length; i++) {
      for (var j = 0; j < m.map[i].length; j++) {
        // HACK: Sometimes map editor results in maps that have a mix of strings and ints for height
        const h = parseInt(m.map[i][j].h, 10);
        switch (m.map[i][j].t) {
          case 'b':
            mapRef[j][m.map.length - i - 1] = new Box(h, j, m.map.length - i - 1);
            break;
          case 'l':
            mapRef[j][m.map.length - i - 1] = new LightBox(h, j, m.map.length - i - 1);
            nbrLights++;
            break;
          default:
            invariant(false, 'Map contains unsupported element: ' + m.map[i][j].t)
            break;
        }
      }
    }

    if (nbrLights === 0) {
      console.error('No light defined in map');
    }
  }

  forEachBox(fn) {
    for (var i = 0; i < this.levelSize.x; i++) {
      for (var j = 0; j < this.levelSize.y; j++) {
        fn(this.mapRef[i][j], i, j);
      }
    }
  }

  allLightsOn() {
    for (var i = 0; i < this.levelSize.x; i++) {
      for (var j = 0; j < this.levelSize.y; j++) {
        if (this.mapRef[i][j] instanceof LightBox && !this.mapRef[i][j].lightOn) {
          return false;
        }
      }
    }
    return true;
  }

  reset() {
    this.forEachBox(box => box.reset());
  }

  step() {
    this.forEachBox(box => box.step());
  }

  maxBoxHeight() {
    let h = -Infinity;
    this.forEachBox(box => {
      if (box.height > h) {
        h = box.height;
      }
    });
    return h;
  }
}
