import mapData from '../json/maps.json';
import { Box, LightBox } from './box.js';

export class Map {
  constructor(m) {
    var medals = null; // medals for the level
    var levelNumber = null; // what level is the user currently playing
    var botInMap = false;

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
        switch (m.map[i][j].t) {
          case 'b':
            mapRef[j][m.map.length - i - 1] = new Box(m.map[i][j].h, j, m.map.length - i - 1);
            break;
          case 'l':
            mapRef[j][m.map.length - i - 1] = new LightBox(m.map[i][j].h, j, m.map.length - i - 1);
            nbrLights++;
            break;
          default:
            // output error and fall back to box element
            console.error('Map contains unsupported element: ' + m.map[i][j].t);
            mapRef[j][maps.map.length - i - 1] = new Box(m.map[i][j].h, j, m.map.length - i - 1);
            break;
        }
      }
    }

    if (nbrLights === 0) {
      console.error('No light defined in map');
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
    for (var i = 0; i < this.levelSize.x; i++) {
      for (var j = 0; j < this.levelSize.y; j++) {
        this.mapRef[i][j].reset();
      }
    }
  }

  step() {
    for (var i = 0; i < this.levelSize.x; i++) {
      for (var j = 0; j < this.levelSize.y; j++) {
        // update the tile
        this.mapRef[i][j].step();
      }
    }
  }
}


var loadMap = function (x) {
  if (!maps) {
    console.error('Map list is empty');
  } else {
    // set the level number
    levelNumber = x;

    // set the bot starting direction
    lightBot.bot.init(m.direction, m.position);

    // set the level medals
    medals = m.medals;

  }
};

export const maps = mapData.map(m => new Map(m));
