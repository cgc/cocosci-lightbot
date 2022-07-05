import _ from '../../lib/underscore-min.js';
import $ from '../../lib/jquery-min.js';
import jsPsych from '../../lib/jspsych-exported.js';

import { markdown, makePromise, parseHTML, trialErrorHandling, graphicsUrl, setTimeoutPromise, addPlugin, documentEventPromise, invariant, waitForSpace, completeModal } from '../../optdisco/js/utils.js';
import { Game } from "./lb/view/game";
import { Map } from './lb/map';
import { Bot } from './lb/bot';
import instructions, { allInstructions, instructionsByName, processInstructions } from './lb/instructions';

import Sortable from 'sortablejs';

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
        const { source, header, name, onChange } = options;
        this.source = source;
        this.header = header;
        this.name = name;
        this.onChange = onChange;
    }
    render() {
        invariant(!this.el);
        invariant(!this.sortable);

        const instHTML = this.source ? allInstructions.map(i => renderInstructionToHTML(i)).join('') : '';

        const cls = this.source ? 'is-source' : '';
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
        this.sortable.option("disabled", true);
        this.el.classList.add('is-disabled');
    }

    enable() {
        this.sortable.option("disabled", false);
        this.el.classList.remove('is-disabled');
    }

    destroy() {
        this.sortable.destroy();
    }

    clear() {
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
                        <button class="Editor-play btn btn-primary"></button>
                        <button class="Editor-check btn btn-info">Quick Run⚡️</button>
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
        const { map: m, onProgramUpdate, onComplete, onClick } = options;
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
            new InstructionList({ source: true, header: 'Instructions', name: 'instructions', onChange }),
            new InstructionList({ source: false, header: 'Main', name: 'main', onChange }),
            new InstructionList({ source: false, header: 'Process 1', name: 'process1', onChange }),
            new InstructionList({ source: false, header: 'Process 2', name: 'process2', onChange }),
            new InstructionList({ source: false, header: 'Process 3', name: 'process3', onChange }),
            new InstructionList({ source: false, header: 'Process 4', name: 'process4', onChange }),
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

                // we also add a clear button
                const clear = parseHTML(`
                    <button class="Editor-clear btn btn-default btn-sm" data-name="${il.name}">Clear ${il.header}</button>
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
            parent.appendChild(il.render());
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
                data.complete.push({success, time: Date.now()});
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

async function tutorial(root, config) {
    function _iter(arg) {
        // makes sure you can iter over the arg whether it's falsey, an element, or array
        return Array.isArray(arg) ? arg : arg ? [arg] : [];
    }

    let resolve;
    const complete = new Promise(r => resolve = r);
    const {editor, data} = Editor.newEditorWithAnalytics(root, {
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
            '.Editor-controls',
            '.Editor-sidebar',
        ],
        normalInstructions: [
            '.Editor-check',
            '.Editor-clearButtons',
            '.Editor-counters',
            '.Editor-instructions',
            ...processInstructions.map(p => `[data-id=${p.instructionName}]`),
        ],
        normalInstructionsEditor: [
            '.Editor-check',
            '.Editor-counters',
            ...processInstructions.map(p => `[data-id=${p.instructionName}]`),
            ...processInstructions.map(p => `.InstructionList[data-name=${p.instructionName}]`),
            ...processInstructions.map(p => `.Editor-clear[data-name=${p.instructionName}]`),
        ],
        normalInstructionsEditorWithProcess1: [
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
        root.querySelector('.Editor-play').classList.add('invisible');
    }

    root.querySelector('.Editor').classList.add('is-tutorial');
    root.querySelector('.Editor').classList.add(`is-tutorial-theme-${config.ui}`);

    for (const g of _iter(config.glow)) {
        root.querySelector(`[data-id=${g}]`).classList.add('glow')
    }

    // Add message

    const msg = root.querySelector('.Editor-message');
    const spacebar = '\n\nPress spacebar to continue.';
    msg.innerHTML = markdown(config.msgIntroNoSpacebar || config.msgIntro + spacebar)

    if (config.program) {
        editor.setProgram(config.program);
        await waitForSpace();
        data.postIntro = Date.now();

        msg.innerHTML = markdown(config.msgWhileExecuting || '');
        editor.execute();
        editor.update();
    }

    // If no program is supplied, then we're waiting for it to be written here.
    await complete;

    msg.innerHTML = markdown(config.msgOutroNoSpacebar || config.msgOutro + spacebar)

    if (config.playAfterRun) {
        root.querySelector('.Editor-play').classList.remove('invisible');
    }
    await waitForSpace();

    editor.destroy();
    data.end = Date.now();
    return data;
}

addPlugin('LightbotTutorialSequence', trialErrorHandling(async function (root, trial) {
    const {editor, data} = Editor.newEditorWithAnalytics(root, {
        map: trial.map,
    });
    data.times = [];

    const msg = root.querySelector('.Editor-message');
    const spacebar = '\n\nPress spacebar to continue.';

    for (const t of trial.sequence) {
        for (const fn of ['remove', 'add']) {
            if (t.classList && t.classList[fn]) {
                for (const [sel, cls] of Object.entries(t.classList[fn])) {
                    root.querySelector(sel).classList[fn](cls);
                }
            }
        }
        editor.setProgram(t.program);
        msg.innerHTML = markdown(t.message + spacebar);

        await waitForSpace();
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
}));
