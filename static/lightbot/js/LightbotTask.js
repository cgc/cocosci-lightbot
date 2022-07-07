import _ from '../../lib/underscore-min.js';
import $ from '../../lib/jquery-min.js';
import jsPsych from '../../lib/jspsych-exported.js';

import { markdown, makePromise, parseHTML, trialErrorHandling, graphicsUrl, setTimeoutPromise, addPlugin, documentEventPromise, invariant, waitForSpace, completeModal, elementEventPromise } from '../../optdisco/js/utils.js';
import { Game } from "./lb/view/game";
import { Map } from './lb/map';
import { Bot } from './lb/bot';
import instructions, { allInstructions, instructionsByName, processInstructions } from './lb/instructions';

import Sortable from 'sortablejs';
import { CameraControls } from './lb/view/CameraControls.js';
import { MapCoordinateContext } from './lb/view/MapCoordinateContext.js';
import { LightBox } from './lb/box.js';

/*

Some test cases:

W (make sure non-terminal works too)
WWWS (make sure last light animates)
WWWSR (action after termination, to make sure it's not animated)
1 | WS1 (make sure recursion works)
1 | 1 (make sure the infinite loop w/o actions is ok)

*/

// HACK: can we get instructions to append?

export function renderInstructionToHTML(i) {
    return `<span data-id="${i.instructionName}" class="InstructionList-instruction">${i.label} <a class="InstructionList-close">&#10005;</a></span>`;
}

class InstructionList {
    constructor(options) {
        const { source, header, name, onChange, editable=true } = options;
        this.source = source;
        this.header = header;
        this.name = name;
        this.onChange = onChange;
        this.editable = editable;
        this.disabled = false;
        this._render();
        if (!this.editable) {
          this.disable();
        }
    }
    _render() {
        invariant(!this.el);
        invariant(!this.sortable);

        const instHTML = this.source ? allInstructions.map(i => renderInstructionToHTML(i)).join('') : '';

        const cls = [(this.source ? 'is-source' : ''), (this.editable ? 'is-editable' : 'is-not-editable')].join(' ');
        const el = this.el = parseHTML(`
            <div class="InstructionList ${cls}" data-header="${this.header}" data-name="${this.name}">
                <div class="InstructionList-header">
                    ${this.header}
                </div>
                <div class="InstructionList-instructions">
                    ${instHTML}
                </div>
            </div>
        `);

        $(el).on('click', '.InstructionList-close', (e) => {
            e.preventDefault();
            if (this.disabled) {
              return;
            }
            $(e.target).closest('[data-id]').remove();
            this.onChange({type: 'remove'});
        });

        const defaults = {
            animation: 250,
        };
        const instListDefaults = {
            group: "singletonGroup",
            scroll: true,
            //onSort: (evt) => {}, avoid this one, b/c there are multiple events when moving between lists.
            onAdd: (evt) => {
                this.onChange({type: 'add'});
            },
            onUpdate: (evt) => {
                this.onChange({type: 'update'});
            },
        };
        const sourceListDefaults = {
            sort: false,
            group: {
                name: instListDefaults.group,
                pull: 'clone',
                put: false,
            },
            onMove(evt) {
                // https://github.com/SortableJS/Sortable/issues/1813#issuecomment-638218411
                // ? https://github.com/SortableJS/Sortable/issues/2063
                // HACK: this is better, but only if we can figure out how to do it with cloned instructions...
                /*
                if (evt.to !== evt.from) {
                    evt.to.append(evt.dragged);

                    return false;
                }
                */
            },
        };
        this.sortableEl = el.querySelector('.InstructionList-instructions');
        this.sortable = Sortable.create(this.sortableEl, {
            ...defaults,
            ...(this.source ? sourceListDefaults : instListDefaults),
        });

        return el;
    }

    disable() {
        this.disabled = true;
        this.sortable.option("disabled", true);
        this.el.classList.add('is-disabled');
    }

    enable() {
        if (!this.editable) {
          return;
        }
        this.disabled = false;
        this.sortable.option("disabled", false);
        this.el.classList.remove('is-disabled');
    }

    destroy() {
        this.sortable.destroy();
    }

    clear() {
        if (this.disabled) {
          return;
        }
        this.sortableEl.innerText = '';
        this.onChange({type: 'clear'});
    }
}


function instructionsFromILs(ilsByHeader) {
    const max = 1000;
    let count = 0;
    const main = ilsByHeader['Main'].sortable.toArray();
    function getInstructions(insts) {
        const rv = [];
        for (const instruction of insts) {
            if (count > max) {
                return rv;
            }
            count++;

            const cls = instructionsByName[instruction];
            invariant(cls, `Unknown instruction ${instruction}`);
            switch (instruction) {
                case instructions.Process1Instruction.instructionName:
                case instructions.Process2Instruction.instructionName:
                case instructions.Process3Instruction.instructionName:
                case instructions.Process4Instruction.instructionName: {
                    const sr = ilsByHeader[cls.label].sortable.toArray();
                    rv.push(new cls(getInstructions(sr)));
                    break;
                }
                default:
                    rv.push(new cls());
                    break
            }
        }
        return rv;
    }
    return getInstructions(main);
}

function programFromILs(ilsByName) {
    const rv = {};
    for (const k of ['main', 'process1', 'process2', 'process3', 'process4']) {
        rv[k] = ilsByName[k].sortable.toArray().map(i => instructionsByName[i].actionCode).join('');
    }
    return rv;
}



class Editor {
    constructor(root, options) {
        this.root = root;
        root.innerHTML = `
        <div class="Editor">
            <div class="Editor-main">
                <div class="Editor-controls">
                    <div class="Editor-playButtons">
                        <button class="Editor-play btn btn-primary btn-lg"></button>
                        <button class="Editor-check btn btn-info btn-lg">Quick Run⚡️</button>
                        <!--<button class="Editor-continue btn btn-success btn-lg hide">Continue</button>-->
                    </div>
                    <div class="Editor-clearButtons">
                    </div>
                    <div class="Editor-counters">
                        <div class="Counter is-step hide">
                            <div class="Counter-header">Step<br />Count</div>
                            <div class="Counter-value"></div>
                        </div>
                        <div class="Counter is-length hide">
                            <div class="Counter-header">Instruction<br />Count</div>
                            <div class="Counter-value"></div>
                        </div>
                    </div>
                </div>
                <div class="Editor-canvas">
                    <div class="Editor-message">${options.message||''}</div>
                    <div class="Editor-cameraControls"></div>
                    <canvas width="690" height="670"></canvas>
                </div>
            </div>
            <div class="Editor-sidebar">
                <div class="Editor-instructions">
                </div>
                <div class="Editor-instructionSource">
                </div>
            </div>
        </div>`;
        const { map: m, onProgramUpdate, onComplete, onClick, editable=true } = options;
        const map = new Map(m);
        const bot = new Bot(map, m.position, m.direction)
        const game = this.game = new Game(root.querySelector('canvas'), bot, {
            onComplete: (success) => {
                this.update();
                onComplete(success);
            },
            onStep: () => {
                stepCounter.innerText = bot.actionCounter;
            }
        });
        const cc = new CameraControls(root.querySelector('.Editor-cameraControls'), {game});
        game.cameraControls = cc;

        const playButton = this.playButton = root.querySelector('.Editor-play');
        const checkButton = this.checkButton = root.querySelector('.Editor-check');
        const lengthCounter = root.querySelector('.Counter.is-length .Counter-value');
        const stepCounter = root.querySelector('.Counter.is-step .Counter-value');

        function onChange(e) {
            const program = programFromILs(ilsByName);
            lengthCounter.innerText = (
                program.main.length +
                program.process1.length +
                program.process2.length +
                program.process3.length +
                program.process4.length
            );
            stepCounter.innerText = '';
            onProgramUpdate({
                ...e,
                program,
                time: Date.now(),
            });
        }
        this.onChange = onChange;

        const ils = this.ils = [
            new InstructionList({ source: true, header: 'Instructions', name: 'instructions', onChange, editable }),
            new InstructionList({ source: false, header: 'Main', name: 'main', onChange, editable }),
            new InstructionList({ source: false, header: 'Process 1', name: 'process1', onChange, editable }),
            new InstructionList({ source: false, header: 'Process 2', name: 'process2', onChange, editable }),
            new InstructionList({ source: false, header: 'Process 3', name: 'process3', onChange, editable }),
            new InstructionList({ source: false, header: 'Process 4', name: 'process4', onChange, editable }),
        ];
        const ilsByHeader = this.ilsByHeader = {};
        const ilsByName = this.ilsByName = {};
        for (const il of ils) {
            ilsByHeader[il.header] = il;
            ilsByName[il.name] = il;
            let parent;
            if (il.source) {
                parent = root.querySelector('.Editor-instructionSource');
            } else {
                parent = root.querySelector('.Editor-instructions');

                const cls = editable ? '' : 'hide';
                // we also add a clear button
                const clear = parseHTML(`
                    <button class="Editor-clear btn btn-default btn-sm ${cls}" data-name="${il.name}">Clear ${il.header}</button>
                `)
                clear.addEventListener('click', (e) => {
                    e.preventDefault();
                    ilsByName[e.target.getAttribute('data-name')].clear();
                });
                root.querySelector('.Editor-clearButtons').appendChild(clear);

                if (il.name == 'main') {
                    // we also add a break
                    root.querySelector('.Editor-clearButtons').appendChild(parseHTML('<div class="break"></div>'));
                }
            }
            parent.appendChild(il.el);
        }

        playButton.addEventListener('click', (e) => {
            onClick({label: e.target.innerText, time: Date.now()});
            e.preventDefault();
            if (game.state() == 'init') {
                this.execute();
            } else {
                game.reset();
            }
            this.update();
        });
        checkButton.addEventListener('click', (e) => {
            onClick({label: e.target.innerText, time: Date.now()});
            e.preventDefault();
            this.execute({check: true});
        });

        this.update(); // to set buttons

        if (options.showLengthCounter) {
            root.querySelector('.Counter.is-length').classList.remove('hide');
        }
    }

    destroy() {
        for (const il of this.ils) {
            il.destroy();
        }
        this.game.destroy();
    }

    update() {
        const state = this.game.state();

        if (state == 'exec') {
            for (const il of this.ils) {
                il.disable();
            }
        } else {
            for (const il of this.ils) {
                il.enable();
            }
        }

        const stateToCls = {
            init: 'btn-primary',
            exec: 'btn-danger',
            post: 'btn-warning',
        };
        for (const s of Object.keys(stateToCls)) {
            if (s == state) {
                this.playButton.classList.add(stateToCls[s]);
            } else {
                this.playButton.classList.remove(stateToCls[s]);
            }
        }
        if (state == 'init') {
            this.playButton.innerText = 'Run';
        } else if (state == 'exec') {
            this.playButton.innerText = 'Stop';
        } else {
            this.playButton.innerText = 'Reset';
        }
    }

    execute(options) {
        const fn = options && options.check ? 'check' : 'execute';
        this.game[fn](instructionsFromILs(this.ilsByHeader));
    }

    setProgram(insts) {
        const nodes = this.ilsByName['instructions'].sortableEl.children;
        const nodesById = {};
        for (const node of nodes) {
            nodesById[node.getAttribute('data-id')] = node;
        }

        function _setIL(il, insts) {
            il.sortableEl.innerHTML = '';
            for (const inst of insts) {
                il.sortableEl.appendChild(nodesById[inst].cloneNode(true));
            }
        }

        if (Array.isArray(insts)) {
            _setIL(this.ilsByName['main'], insts);
        } else {
            for (const [name, insts_] of Object.entries(insts)) {
                _setIL(this.ilsByName[name], insts_);
            }
        }
        this.onChange({type: 'setProgram'});
    }

    static newEditorWithAnalytics(root, options) {
        const data = {
            start: Date.now(),
            programUpdates: [],
            clicks: [],
            complete: [],
        };

        const editor = new Editor(root, {
            ...options,
            onComplete(success) {
                data.complete.push({success, time: Date.now(), program: programFromILs(editor.ilsByName)});
                options.onComplete && options.onComplete(success);
            },
            onProgramUpdate(e) {
                console.log(e);
                data.programUpdates.push(e);
            },
            onClick(e) {
                data.clicks.push(e);
            },
        });

        return {editor, data};
    }
}

async function waitForClick(btn) {
    btn.focus();
    await elementEventPromise(btn, 'click');
}

async function tutorial(root, config) {
    function _iter(arg) {
        // makes sure you can iter over the arg whether it's falsey, an element, or array
        return Array.isArray(arg) ? arg : arg ? [arg] : [];
    }

    let resolve;
    const complete = new Promise(r => resolve = r);
    const {editor, data} = Editor.newEditorWithAnalytics(root, {
        ...config.editorOptions,
        map: config.map,
        onComplete(success) {
            if (config.requiresSuccess) {
                if (success) {
                    resolve();
                }
            } else {
                resolve();
            }
        },
    });

    const sels = {
        playOnce: [
            '.Editor-cameraControls',
            '.Editor-controls',
            '.Editor-sidebar',
        ],
        normalInstructions: [
            '.Editor-cameraControls',
            '.Editor-check',
            '.Editor-clearButtons',
            '.Editor-counters',
            '.Editor-instructions',
            ...processInstructions.map(p => `[data-id=${p.instructionName}]`),
        ],
        normalInstructionsEditor: [
            '.Editor-cameraControls',
            '.Editor-check',
            '.Editor-counters',
            ...processInstructions.map(p => `[data-id=${p.instructionName}]`),
            ...processInstructions.map(p => `.InstructionList[data-name=${p.instructionName}]`),
            ...processInstructions.map(p => `.Editor-clear[data-name=${p.instructionName}]`),
        ],
        normalInstructionsEditorWithProcess1: [
            '.Editor-cameraControls',
            '.Editor-check',
            '.Editor-counters',
            ...processInstructions.slice(1).map(p => `[data-id=${p.instructionName}]`),
            ...processInstructions.slice(1).map(p => `.InstructionList[data-name=${p.instructionName}]`),
            ...processInstructions.slice(1).map(p => `.Editor-clear[data-name=${p.instructionName}]`),
        ],
    }[config.ui];

    // Setting up styling

    for (const sel of sels) {
        root.querySelector(sel).classList.add('hide');
    }
    for (const [sel, cls] of Object.entries(config.classList?.remove || {})) {
        root.querySelector(sel).classList.remove(cls);
    }
    if (config.playAfterRun) {
        // using this class because it hides the element, but still has it take space in DOM.
        // nice b/c we will show it later after the program has been run.
        root.querySelector('.Editor-play').classList.add('invisible');
    }

    root.querySelector('.Editor').classList.add('is-tutorial');
    root.querySelector('.Editor').classList.add(`is-tutorial-theme-${config.ui}`);

    // HACK: Do this before we add glow to avoid having it copy to program.
    if (config.program) {
        editor.setProgram(config.program);
    }

    for (const g of _iter(config.glow)) {
        root.querySelector(`.InstructionList.is-source [data-id=${g}]`).classList.add('glow')
    }

    // Add message
    const msg = root.querySelector('.Editor-message');
    const button = '\n\n<button class="btn btn-success">Continue</button>';
    msg.innerHTML = markdown(config.msgIntro) + (config.program ? button : '');

    if (config.program) {
        await waitForClick(msg.querySelector('.btn-success'));
        data.postIntro = Date.now();

        msg.innerHTML = markdown(config.msgWhileExecuting || '');
        editor.execute();
        editor.update();
    }

    // If no program is supplied, then we're waiting for it to be written here.
    await complete;

    msg.innerHTML = markdown(config.msgOutro) + button;

    if (config.playAfterRun) {
        root.querySelector('.Editor-play').classList.remove('invisible');
    }
    await waitForClick(msg.querySelector('.btn-success'));

    editor.destroy();
    data.end = Date.now();
    return data;
}

addPlugin('LightbotTutorialSequence', trialErrorHandling(async function (root, trial) {
    const {editor, data} = Editor.newEditorWithAnalytics(root, {
        map: trial.map,
        editable: false,
    });
    data.times = [];

    const msg = root.querySelector('.Editor-message');

    const button = '\n\n<button class="btn btn-success">Continue</button>';

    for (const t of trial.sequence) {
        for (const fn of ['remove', 'add']) {
            if (t.classList && t.classList[fn]) {
                for (const [sel, cls] of Object.entries(t.classList[fn])) {
                    root.querySelector(sel).classList[fn](cls);
                }
            }
        }
        editor.setProgram(t.program);
        msg.innerHTML = markdown(t.message + button);

        await waitForClick(msg.querySelector('.btn-success'));
        data.times.push(Date.now());
    }

    editor.destroy();
    data.end = Date.now();
    jsPsych.finishTrial(data);
}));

addPlugin('LightbotTutorial', trialErrorHandling(async function (root, trial) {
    const data = await tutorial(root, trial);
    jsPsych.finishTrial(data);
}));

addPlugin('LightbotTask', trialErrorHandling(async function (root, trial) {
    const {editor, data} = Editor.newEditorWithAnalytics(root, {
        map: trial.map,
        onComplete(success) {
            if (!success) {
                return;
            }
            completeModal(`
            # Great Job!

            You solved the problem! You can **Go back** if you want to update your solution.

            When you're ready, **Submit** your solution to continue.
            `, {cancelLabel: 'Go back', continueLabel: 'Submit'}).then((continueToNext) => {
                if (!continueToNext) {
                    return;
                }
                editor.destroy();

                data.end = Date.now();
                jsPsych.finishTrial(data);
            });
        },
        ...trial.editorOptions,
    });
    data.trialConfig = trial.addToData;
}));

addPlugin('LightbotLightOrderTask', trialErrorHandling(async function (root, trial) {
    const {editor, data} = Editor.newEditorWithAnalytics(root, {
        map: trial.map,
        editable: false,
    });
    root.querySelector('.Editor-playButtons').classList.add('hide');
    data.trialConfig = trial.addToData;
    data.events = [];
    data.boxes = [];
    const {game} = editor;
    const map = game.map;
    const c = game.canvas;

    function done() {
      data.boxes = data.boxes.map(box => [box.x, box.y]);
      editor.destroy();
      data.end = Date.now();
      jsPsych.finishTrial(data);
    }

    // We shim out the game's draw() function, calling it with a version that also draws
    // numbers. Unfortuantely, this doesn't properly work when numbers are occluded.
    // An alternative could overwrite each box's draw function instead.
    const originalDraw = game.draw.bind(game);
    game.draw = () => {
      originalDraw();
      const ctx = game.ctx;
      if (!ctx.fillText) {
        // We skip whenever it's a draw() happening b/c of MapCoordinateContext
        return;
      }
      ctx.fillStyle = 'black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '14px serif';
      for (let i = 0; i < data.boxes.length; i++) {
        const box = data.boxes[i];
        const p = game.projection.project(
          (box.x + 0.5) * box.getEdgeLength(),
          box.getHeight() * box.getEdgeLength(),
          (box.y + 0.5) * box.getEdgeLength());
        ctx.fillText(""+(i+1), p.x, p.y);
      }
    };

    editor.setProgram(trial.program);
    const message = root.querySelector('.Editor-message');

    function render() {
      const allLightsOn = map.allLightsOn();
      const button = allLightsOn ? '<button class="btn btn-success">Continue</button>' : '';
      const reset = data.boxes.length ?  '<button class="btn btn-default">Reset</button>' : '';
      const msg = allLightsOn ? `
      Submit your response with **Continue**. Or, **Reset** if you want to change your answer.
      ` : `
      This program solves the task. But in what order will lightbot activate the lights?

      Click on the lights in the order lightbot will activate them when running this program.
      `;
      message.innerHTML = markdown(`
      ${msg}

      ${reset}
      ${button}
      `);
      reset && message.querySelector('.btn-default').addEventListener('click', (e) => {
        data.events.push({type: 'reset', time: Date.now()});
        map.reset();
        data.boxes = [];
        render();
      });
      button && message.querySelector('.btn-success').addEventListener('click', (e) => {
        done();
      });
    }

    c.addEventListener('click', (e) => {
      const rect = c.getBoundingClientRect();
      const normx = (e.clientX - rect.left) / rect.width;
      const normy = (e.clientY - rect.top) / rect.height;
      const loc = MapCoordinateContext.mapLocationFromRelativeCoordinate(game, normx, normy);
      if (!loc) {
        return;
      }
      const box = map.mapRef[loc[0]][loc[1]];
      const isLight = box instanceof LightBox;
      // NOTE: We want to copy `lightOn` before the `toggleLight()`.
      data.events.push({type: 'lightClick', loc, isLight, lightOn: box.lightOn, time: Date.now()});
      if (isLight && !box.lightOn) {
        box.toggleLight();
        data.boxes.push(box);
        render();
      }
    });

    render();
}));
