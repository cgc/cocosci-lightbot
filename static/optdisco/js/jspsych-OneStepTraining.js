import {completeModal, trialErrorHandling, graphicsUrl} from './utils.js';

const stateTemplate = (state, graphic, isSucc) => `
<div class='State' data-state="${state}" data-issucc="${isSucc}"><img src="${graphicsUrl(graphic)}" /></div>
`;

function render(graph, gfx, state, stateParams) {
    let other_state_divs = [];
    let succ_states = graph.graph[state];
    // console.log(gfx[state] + ": " + _.map(succ_states, (s) => gfx[s]).join(""));
    let other_states = _.reject(graph.states, (s) => {return (s === state) || (_.includes(succ_states, s))});
    other_states = _.first(other_states, stateParams.nDistractors);
    other_states = other_states.concat(succ_states);
    other_states = jsPsych.randomization.repeat(other_states, 1);
    for (const s of other_states) {
        if (_.includes(succ_states, s)) {
            other_state_divs.push(stateTemplate(s, gfx[s], true))
        }
        else {
            other_state_divs.push(stateTemplate(s, gfx[s], false))
        }
    }
    other_state_divs = other_state_divs.join("");
    let peek = `
    <button class="btn btn-primary Peek">Peek</button>
    <div>Reminder: To continue to the next stage, you need to answer
    every association correctly without peeking.</div>
    `;
    return `
  <div class="GraphTraining">
    <div class="GraphTraining-state">
      <div>${stateTemplate(state, gfx[state])}</div>
    </div>
    <div id="GraphTraining-msg">Pick the associated pictures:</div>
    <div class="GraphTraining-other_states">
      ${other_state_divs}
    </div>
    ${stateParams.peekable ? peek : ""}
  </div>
  `;
}

function showState(el, graph, graphics, state, stateParams) {
    let resolve;
    let promise = new Promise(function(res, rej) {
        resolve = res;
    });

    let peeked = false;
    let success = true;
    let selected = [];

    el.innerHTML = render(graph, graphics, state, stateParams);
    let succ_left = graph.graph[state];
    let other_states = el.querySelector('.GraphTraining-other_states').querySelectorAll('.State');
    let other_states_params = [];
    for (const s of other_states) {
        const curstate = parseInt(s.getAttribute('data-state'), 10);
        other_states_params.push({state: curstate, picture: graphics[curstate]})
    }

    let highlightSuccessorStates = function() {
        for (const s of other_states) {
            const state = parseInt(s.getAttribute('data-state'), 10);
            if (_.includes(succ_left, state)) {
                s.classList.add("SuccState");
            }
        }
    };
    let unhighlightSuccessorStates = function () {
        for (const s of other_states) {
            const state = parseInt(s.getAttribute('data-state'), 10);
            if (_.includes(succ_left, state)) {
                s.classList.remove("SuccState");
            }
        }
    };
    for (const s of other_states) {
        s.addEventListener('click', function(e) {
            e.preventDefault(); // HACK
            const selected_state = parseInt(s.getAttribute('data-state'), 10);
            selected.push({selected_state, timestamp: Date.now(), picture: graphics[selected_state]});
            if (_.includes(succ_left, selected_state)) {
                s.classList.add("HighlightedState");
                succ_left = _(succ_left).reject(s => s === selected_state);
            }
            else {
                s.classList.add("NonSuccState");
                document.getElementById("GraphTraining-msg").innerHTML = "Whoops, you made a mistake!";
                highlightSuccessorStates();
                setTimeout(unhighlightSuccessorStates, 1250);
                success = false;
            }
            if (succ_left.length === 0) {
                let response_data = {
                    state,
                    picture: graphics[state],
                    peeked,
                    selected,
                    other_states_params,
                    success
                };
                Object.assign(response_data, stateParams);
                setTimeout(() => resolve(response_data), 1000);
            }
        });
    }

    if (stateParams.peekable) {
        let peek = el.querySelector(".Peek");
        peek.addEventListener('click', function(e) {
            e.preventDefault(); // HACK
            peeked = true;
            highlightSuccessorStates();
            setTimeout(unhighlightSuccessorStates, 200);
        });
    }
    return promise;
}

jsPsych.plugins.OneStepTraining = (function() {
    var plugin = {};
    plugin.info = {
        name: 'OneStepTraining',
        parameters: {}
    };

    plugin.trial = trialErrorHandling(async function(display_element, trial) {
        console.log(trial);

        const startTime = Date.now();
        const data = {
            times: [],
            responses: []
        };
        /*
        */

        function generateRandomStateOrder(graph) {
            // generates a state ordering without adjacent states occuring after one another
            for (var i = 0; i < 10000; i++) {
                let state_order = jsPsych.randomization.repeat(graph.states, 1);
                let adj_states = false;
                for (const ii of _.range(0, state_order.length - 1)) {
                    let curr = state_order[ii];
                    let next = state_order[ii + 1];
                    if (_.includes(graph.graph[curr], next)) {
                        adj_states = true;
                        break
                    }
                }
                if (!adj_states) {
                    return state_order
                }
            }
        }

        function generateAllStateTrainingBlocks(el, graph, graphics, trainingParams) {
            let allsuccess = true;
            let state_order = generateRandomStateOrder(graph);
            let nDistractors = trainingParams.nDistractors;

            let training = Promise.resolve();
            state_order.forEach(state => {
                    training = training.then(() => {
                        return showState(el, graph, graphics, state, {nDistractors})
                            .then(function (response_data) {
                                    allsuccess = allsuccess && response_data.success && !response_data.peeked;
                                    console.log("trained: " + allsuccess);
                                    data.responses.push(response_data);
                                }
                            )
                    });
                }
            );

            training = training.then(() => {
                if (!allsuccess) {
                    console.log('not trained yet');
                    return trainingStates(el, graph, graphics, trainingParams)
                }
            });

            return training
        }

        function spacedRepetition(el, graph, graphics, trainingParams) {
            let nDistractors = trainingParams.nDistractors;
            let peekable = trainingParams.peekable;

            let sampleSet = _.memoize((boxes, t) => {
                t = typeof(t) === 'undefined' ? 1 : t;
                let nb = boxes.length;
                let bi = _.range(nb).map((b) => _.range((nb - b)^t).map(() => b));
                bi = _.filter(bi, (b, i) => boxes[i].length > 0);
                return _.flatten(bi)
            });

            function sampleBox(boxes, n, t) {
                n = typeof(n) === 'undefined' ? 1 : n;
                t = typeof(t) === 'undefined' ? 1 : t;
                let s = _.times(n, () => _.sample(sampleSet(boxes, t)));
                return s.length === 1 ? s[0] : s
            }

            function sampleUnconnected(boxes, lastState, graph) {
                for (var i = 0; i < 10000; i++) {
                    let nextBox = sampleBox(boxes);
                    let nextBoxIdx = _.random(boxes[nextBox].length - 1);
                    if (!(_.includes(graph.graph[lastState], boxes[nextBox][nextBoxIdx]) ||
                          (lastState === boxes[nextBox][nextBoxIdx]))) {
                        return {nextBox, nextBoxIdx}
                    }
                }
            }

            let nBoxes = 3;
            let memoBoxes = _.range(nBoxes).map(()=>[]);
            memoBoxes[0] = generateRandomStateOrder(graph);
            console.log(memoBoxes);

            function repetition(response_data) {
                data.responses.push(response_data);
                console.log(data);

                // depending on if the participant was correct, place this in the next memory box or at the beginning
                let correct = response_data.success && !response_data.peeked;
                let memoBoxN;
                if (correct) {
                    memoBoxN = _.min([response_data.memoBox + 1, memoBoxes.length - 1]);
                }
                else {
                    memoBoxN = 0;
                }
                memoBoxes[memoBoxN].push(response_data.state);

                // if everything is in the final memory box, the participant is trained
                if (memoBoxes[memoBoxes.length - 1].length === graph.states.length) {
                    console.log("done training");
                    return
                }

                // randomly select from one of the memory boxes but biased towards earlier ones
                console.log(memoBoxes);
                let next = sampleUnconnected(memoBoxes, response_data.state, graph);
                let nextState = memoBoxes[next.nextBox].splice(next.nextBoxIdx, 1)[0];
                let stateParams = {nDistractors, memoBox: next.nextBox, peekable: peekable};

                return showState(el, graph, graphics, nextState, stateParams)
                    .then(repetition)
            }

            let training = Promise.resolve();
            training = training.then(() => {
                let stateParams = {nDistractors, memoBox: 0};
                return showState(el, graph, graphics, memoBoxes[0].shift(), stateParams)
                    .then(repetition)
            });
            return training
        }

        function trainingStates(el, graph, graphics, trainingParams) {
            let training;
            console.log("Training Strategy: "+trainingParams.strategy);
            if (trainingParams.strategy === 'allstates') {
                training = generateAllStateTrainingBlocks(el, graph, graphics, trainingParams);
            }
            else if (trainingParams.strategy === 'spacedrep') {
                training = spacedRepetition(el, graph, graphics, trainingParams);
            }
            return training.then(() => {
                console.log(`successfully trained on ${trainingParams.nDistractors} distractors`);
                display_element.innerHTML = ''; // HACK???
                jsPsych.finishTrial(data);
            })
        }
        return trainingStates(display_element, trial.graph, trial.graphics, trial.trainingParams);
    });

    return plugin;
})();
