import {random} from './utils.js';

function range(n) {
  return [...Array(n).keys()];
}

function argmaxes(arr) {
  /*
  Returns the indices of the max values of the array.
  Handy for things like random selection among max items.
  */
  let maxval = arr[0];
  let idxs = [];
  for (const i of range(arr.length)) {
    const v = arr[i];
    if (v == maxval) {
      idxs.push(i);
    } else if (v > maxval) {
      maxval = v;
      idxs = [i];
    }
  }
  return idxs;
}

export class AdaptiveTasks {
  constructor(graph) {
    this.counter = new Array(graph.states.length).fill(0);
    // We compute the set of tasks; since the graph undirected, this will have both directions of tasks.
    this.tasks = [];
    for (const s of graph.states) {
      for (const ns of graph.successors(s)) {
        this.tasks.push({start: s, goal: ns});
      }
    }
  }
  onStateVisit(s) {
    this.counter[s]++;
  }
  sampleLowOccTrial() {
    let c = this.counter;
    const modal = new Set(argmaxes(c));
    const validTasks = this.tasks.filter(t => !(modal.has(t.start) || modal.has(t.goal)))
    const scores = validTasks.map(t => -(c[t.start] + c[t.goal]))
    const minTaskIdxs = argmaxes(scores);
    console.log('counter', this.counter, 'modal', modal, 'minTasks', minTaskIdxs.map(i => validTasks[i]));
    return validTasks[random.choice(minTaskIdxs)];
  }
}
