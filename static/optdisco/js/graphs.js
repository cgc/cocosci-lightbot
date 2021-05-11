import {invariant} from './utils.js';
import jsPsych from '../../lib/jspsych-exported.js';

export function bfs(graph, start, goal, kwargs={}) {
  const successors = kwargs.successors || (state => graph.successors(state));

  function reconstructPath(cameFrom, start, goal) {
    const path = [];
    let node = goal;
    while (node != start) {
      node = cameFrom[node];
      path.push(node);
    }
    path.reverse();
    return path;
  }

  const queue = [start];
  const closed = new Set();
  const cameFrom = {};

  while (queue.length) {
    const curr = queue.shift();
    if (curr == goal) {
      return {
        path: reconstructPath(cameFrom, start, goal),
      };
    }
    closed.add(curr);
    for (const succ of successors(curr)) {
      if (!closed.has(succ) && queue.indexOf(succ) === -1) {
        queue.push(succ);
        cameFrom[succ] = curr;
      }
    }
  }
}

export class Graph {
  constructor(adjacency) {
    // Is a list of pairs of states and successors. We assume the graph is directed,
    // so both directions of an edge should be specified for undirected graphs.
    // We intentionally take this as a list instead of a dictionary since JSON dictionaries
    // (which we use as a transport protocol) require strings for keys, but we want to
    // avoid any complicated data conversion or assumptions here.
    // We do ultimately make use of a dictionary to map state to successors, which should
    // work well as long as the input doesn't contain the same state repeated with different
    // data types.
    // Graph([[0, [1, 2]], [1, [3, 4]], [2, [5, 6]], ...]) // an example of a binary tree.
    this._adjacency = {}
    this.states = [];
    for (const [state, successors] of adjacency) {
      this.states.push(state);
      this._adjacency[state] = [...successors]; // making a copy
    }
    this.states.sort();
  }

  successors(state) {
    return this._adjacency[state];
  }

  shuffleSuccessors() {
    /*
    Modifies the graph, shuffling successors.
    */
    for (const state of this.states) {
      this._adjacency[state] = jsPsych.randomization.repeat(this._adjacency[state], 1);
    }
  }
}

export function bestKeys(graph, stateOrder) {
  /*
  This algorithms tries to map keys to radial states (ordered by stateOrder)
  in a way that minimizes distance between their angle and that of the assigned direction.
  */
  const keys = ['L', 'K', 'J', 'I']; // Clockwise starting at right.
  const directions = [0, 1, 2, 3];

  const angles = {};
  stateOrder.forEach((state, order) => {
    angles[state] = order * 2 * Math.PI / graph.states.length;
  });

  const mapping = [];

  for (const curr of graph.states) {
    const neighbors = graph.successors(curr);

    let minCost = Infinity;
    let min;

    for (const d0 of directions) {
      for (const d1 of directions) {
        if (d0 == d1) { continue; }
        for (const d2 of directions) {
          if (d0 == d2 || d1 == d2) { continue; }

          const assignment = [d0, d1, d2];
          const assignmentAngles = assignment.map(a => a * Math.PI / 2);
          const cost = neighbors.reduce(
            (acc, succ, idx) => {
              let d = Math.abs(angles[succ] - assignmentAngles[idx]);
              if (d > Math.PI) {
                d = 2*Math.PI - d;
              }
              return acc + Math.pow(d, 2);
            },
            0,
          );

          if (cost < minCost) {
            minCost = cost;
            min = assignment;
          }
        }
      }
    }
    mapping.push(min.map(idx => keys[idx]));
  }

  return mapping;
}

function sortidx(test) {
  function cmp(a, b) {
    return test[a] < test[b] ? -1 : test[a] > test[b] ? +1 : 0;
  }
  return Array.from(Array(test.length).keys()).sort(cmp);
}

export function clockwiseKeys(graph, stateOrder) {
  /*
  This algorithm maps keys to edges in a clockwise manner.
  */
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  const angles = {};
  const xy = {};
  stateOrder.forEach((state, order) => {
    const a = order * 2 * Math.PI / graph.states.length;
    angles[state] = a;
    xy[state] = [Math.cos(a), Math.sin(a)];
  });

  const mapping = [];

  for (const curr of graph.states) {
    invariant(graph.successors(curr).length <= keys.length, `Bad configuration: node ${curr} has more neighbors than keys.`);
    const neighborAngles = [];
    for (const n of graph.successors(curr)) {
      const diff = [xy[n][0] - xy[curr][0], xy[n][1] - xy[curr][1]];
      let angle = Math.atan2(diff[1], diff[0]);
      if (angle < angles[curr]) {
        angle += Math.PI * 2;
      }
      neighborAngles.push(angle);
    }

    const order = sortidx(neighborAngles); // maps from sorted index to original index.
    const mapped = new Array(order.length);
    order.forEach((orig, sorted) => {
      mapped[orig] = keys[sorted];
    });
    mapping.push(mapped);
  }

  return mapping;
}

export function DEPRECATED_circleOrderToXY(stateOrder) {
  return stateOrder.map((state, idx) => {
    const angle = idx * 2 * Math.PI / stateOrder.length;
    let x = (Math.cos(angle) + 1) / 2;
    let y = (Math.sin(angle) + 1) / 2;
    return [x, y];
  });
}
