import _ from '../../lib/underscore-min.js';
import $ from '../../lib/jquery-min.js';
import jsPsych from '../../lib/jspsych-exported.js';

import { Game } from "./view/game";
import { markdown, makePromise, parseHTML, trialErrorHandling, graphicsUrl, setTimeoutPromise, addPlugin, documentEventPromise, invariant, waitForSpace, completeModal } from '../../optdisco/js/utils.js';
import { Map } from './map.js';
import { Bot } from './bot.js';
import mapData from '../json/maps.json';
import instructions, { allInstructions, instructionsByName } from './instructions';
console.log(instructions)

import Sortable from 'sortablejs';

// AutoScroll??
// destroy()
// sortable.toArray()
// => ['apple', 'orange', 'banana']
// 	<li data-id="banana">Banana</li>

$(document).on('click', '.InstructionList-close', (e) => {
    e.preventDefault();
    $(e.target).closest('[data-id]').remove();
});

class InstructionList {
    constructor(source, header) {
        this.source = source;
        this.header = header;
    }
    render() {
        //const el = $(e.target).closest('.PathIdentification-selectable').get(0);
        const instHTML = this.source ? allInstructions.map(i =>
            `<div data-id="${i.instructionName}" class="InstructionList-instruction">${i.label} <a class="InstructionList-close">&#10005;</a></div>`
        ).join('') : '';

        const cls = this.source ? 'is-source' : '';
        const el = parseHTML(`
            <div id="instructions" class="InstructionList ${cls}">
                <div class="InstructionList-header">
                    ${this.header}
                </div>
                <div class="InstructionList-instructions">
                    ${instHTML}
                </div>
            </div>
        `);

        invariant(!this.sortable);
        const defaults = {
            animation: 250,
        };
        const instListDefaults = {
            group: "singletonGroup",
            scroll: true,
        };
        let clone;
        const sourceListDefaults = {
            sort: false,
            group: {
                name: instListDefaults.group,
                pull: 'clone',
                put: false,
            },
            onClone(evt) {
                clone = evt.clone;
                console.log('onClone')
            },
            onMove(evt) {
                // https://github.com/SortableJS/Sortable/issues/1813#issuecomment-638218411
                // ? https://github.com/SortableJS/Sortable/issues/2063
                // HACK: this is better, but only if we can figure out how to clone !!!!! xxxx
                /*
                if (evt.to !== evt.from) {
                    evt.to.append(evt.dragged);

                    return false;
                }
                */
               /*
                console.log('onMove', clone, clone.parentElement == evt.to)

                if (clone && evt.to !== evt.from) {
                    clone.remove()
                    evt.to.appendChild(evt.dragged);
                    return false;
                }
                */
            },
        };
        this.sortable = Sortable.create(el.querySelector('.InstructionList-instructions'), {
            ...defaults,
            ...(this.source ? sourceListDefaults : instListDefaults),
        });

        return el;
    }

    destroy() {
        this.sortable.destroy();
    }
}


function instructionsFromILs(ilsByHeader) {
    const max = 1000;
    const rv = [];
    const main = ilsByHeader['Main'].sortable.toArray();
    function getInstructions(insts) {
        for (const instruction of insts) {
            if (rv.length > max) {
                return;
            }

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
    }
    getInstructions(main);
    return rv;
}


addPlugin('X', trialErrorHandling(async function (root, trial) {
    root.innerHTML = `
    <div>
        <div id="x" style="display: flex">
        </div>
        <a href="#" class="Editor-play">Play</a>
        <canvas id="foo" width="690" height="670"></canvas>
    </div>`;
    const m = mapData[0];
    console.log(m)
    const map = new Map(m);
    const bot = new Bot(map, m.position, m.direction)
    const game = new Game(window.foo, bot, () => {
        console.log('complete')

        completeModal(`
        # all done!
        `).then(() => {
            for (const il of ils) {
                il.destroy();
            }

            jsPsych.finishTrial();
        });

    });

    const ils = [
        new InstructionList(true, 'Instructions'),
        new InstructionList(false, 'Main'),
        new InstructionList(false, 'Process 1'),
        new InstructionList(false, 'Process 2'),
        new InstructionList(false, 'Process 3'),
        new InstructionList(false, 'Process 4'),
    ];
    const ilsByHeader = {};
    for (const il of ils) {
        ilsByHeader[il.header] = il;
        window.x.appendChild(il.render());
    }

    // HACK: how to timeout? how to handle stopping?
    root.querySelector('.Editor-play').addEventListener('click', (e) => {
        e.preventDefault();
        game.execute(instructionsFromILs(ilsByHeader));
    });
    /*
        // run program button
    $('#runButton').button({
        icons: {
            primary: "ui-icon-play"
        }
    }).click(function() {
        if (lightBot.bot.isInExecutionMode()) {
            // reset the map (resets the bot as well)
            lightBot.map.reset();

            $(this).button('option', {
                label: 'Test',
                icons: {
                    primary: 'ui-icon-play'
                }
            }).removeClass('ui-state-highlight');
        } else {
            var instructions = lightBot.ui.editor.getInstructions($('#programContainer > div > ul > li'), 0);
            lightBot.bot.queueInstructions(instructions);
            lightBot.bot.execute();

            var program = lightBot.ui.editor.getActions("program");
            if (program !== null) {
                testCounter++;
                lightBot.ui.logActions('programTests')
                $(this).button('option', {
                    label: 'Stop & Reset Bot',
                    icons: {
                        primary: 'ui-icon-stop'
                    }
                }).addClass('ui-state-highlight');
            }
        }
    });

    */

    /*
    game.execute([
        new instructions.WalkInstruction(),
        new instructions.WalkInstruction(),
        new instructions.WalkInstruction(),
        new instructions.LightInstruction(),
    ])
            msg = `
        ### Ran out of clicks!
        `;
      }
      return completeModal(msg);

    await waitForSpace();

    console.log('ey', ils.map(il => il.sortable.toArray()));
      */
}));
