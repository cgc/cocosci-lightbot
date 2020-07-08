export function bfs(graph, start, goal, kwargs={}) {
  const successors = kwargs.successors || (state => graph.graph[state]);

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
  constructor(graph) {
    // Graph is a list of nodes and next nodes. Assumed to be undirected.
    function addEdges(graph, node, next_nodes) {
      if (!graph[node]) {
        graph[node] = new Set();
      }
      for (const n of next_nodes) {
        graph[node].add(n);
      }
    }
    this.graph = {};
    this.states = new Set();
    for (const [node, next_nodes] of graph) {
      addEdges(this.graph, node, next_nodes);
      this.states.add(node);
      for (const next_node of next_nodes) {
        addEdges(this.graph, next_node, [node]);
        this.states.add(next_node);
      }
    }
    this.states = [...this.states];
    this.states.sort();
    for (const key of Object.keys(this.graph)) {
      // HACK converting back to list...
      this.graph[key] = [...this.graph[key]];
    }
  }

  shuffleSuccessors() {
    /*
    Modifies the graph, shuffling successors.
    */
    for (const state of this.states) {
      this.graph[state] = jsPsych.randomization.repeat(this.graph[state], 1);
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
    const neighbors = graph.graph[curr];

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
