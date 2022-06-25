class Instruction {
    constructor(name) {
        this.name = name;
    }
}

export class WalkInstruction extends Instruction {
    static instructionName = 'walk'
    static label = 'Walk'
    static actionCode = 'C'
    constructor() {
        super('walk');
    }
}

export class JumpInstruction extends Instruction {
    static instructionName = 'jump'
    static label = 'Jump'
    static actionCode = 'B'
    constructor() {
        super('jump');
    }
}

export class LightInstruction extends Instruction {
    static instructionName = 'light'
    static label = 'Light💡'
    static actionCode = 'A'
    constructor() {
        super('light');
    }
}

export class TurnLeftInstruction extends Instruction {
    static instructionName = 'turnLeft'
    static label = 'Left ⬅️'
    static actionCode = 'E'
    constructor() {
        super('turnLeft');
    }
}

export class TurnRightInstruction extends Instruction {
    static instructionName = 'turnRight'
    static label = 'Right ➡️'
    static actionCode = 'D'
    constructor() {
        super('turnRight');
    }
}

export class Process1Instruction extends Instruction {
    static instructionName = 'process1'
    static label = 'Process 1'
    static actionCode = '1'
    constructor(body) {
        super('process1');
        this.body = body;
    }
}

export class Process2Instruction extends Instruction {
    static instructionName = 'process2'
    static label = 'Process 2'
    static actionCode = '2'
    constructor(body) {
        super('process2');
        this.body = body;
    }
}

export class Process3Instruction extends Instruction {
    static instructionName = 'process3'
    static label = 'Process 3'
    static actionCode = '3'
    constructor(body) {
        super('process3');
        this.body = body;
    }
}

export class Process4Instruction extends Instruction {
    static instructionName = 'process4'
    static label = 'Process 4'
    static actionCode = '4'
    constructor(body) {
        super('process4');
        this.body = body;
    }
}

// Order here controls order in interface.
export const normalInstructions = [
    LightInstruction,
    WalkInstruction,
    JumpInstruction,
    TurnLeftInstruction,
    TurnRightInstruction,
];
export const processInstructions = [
    Process1Instruction,
    Process2Instruction,
    Process3Instruction,
    Process4Instruction,
];
export const allInstructions = normalInstructions.concat(processInstructions);

export const instructionsByClassName = {
    LightInstruction,
    WalkInstruction,
    JumpInstruction,
    TurnLeftInstruction,
    TurnRightInstruction,
    Process1Instruction,
    Process2Instruction,
    Process3Instruction,
    Process4Instruction,
};
export default instructionsByClassName;

export const instructionsByName = {};
export const instructionsByActionCode = {};
for (const inst of allInstructions) {
    instructionsByName[inst.instructionName] = inst;
    instructionsByActionCode[inst.actionCode] = inst;
}
