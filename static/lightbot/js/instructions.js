class Instruction {
    constructor(name) {
        this.name = name;
    }
}

export class WalkInstruction extends Instruction {
    static instructionName = 'walk'
    static label = 'Walk'
    constructor() {
        super('walk');
    }
}

export class JumpInstruction extends Instruction {
    static instructionName = 'jump'
    static label = 'Jump'
    constructor() {
        super('jump');
    }
}

export class LightInstruction extends Instruction {
    static instructionName = 'light'
    static label = 'Light'
    constructor() {
        super('light');
    }
}

export class TurnLeftInstruction extends Instruction {
    static instructionName = 'turnLeft'
    static label = 'Turn Left'
    constructor() {
        super('turnLeft');
    }
}

export class TurnRightInstruction extends Instruction {
    static instructionName = 'turnRight'
    static label = 'Turn Right'
    constructor() {
        super('turnRight');
    }
}

export class Process1Instruction extends Instruction {
    static instructionName = 'process1'
    static label = 'Process 1'
    constructor(body) {
        super('process1');
        this.body = body;
    }
}

export class Process2Instruction extends Instruction {
    static instructionName = 'process2'
    static label = 'Process 2'
    constructor(body) {
        super('process2');
        this.body = body;
    }
}

export class Process3Instruction extends Instruction {
    static instructionName = 'process3'
    static label = 'Process 3'
    constructor(body) {
        super('process3');
        this.body = body;
    }
}

export class Process4Instruction extends Instruction {
    static instructionName = 'process4'
    static label = 'Process 4'
    constructor(body) {
        super('process4');
        this.body = body;
    }
}

export const allInstructions = [
    WalkInstruction,
    TurnRightInstruction,
    TurnLeftInstruction,
    JumpInstruction,
    LightInstruction,
    Process1Instruction,
    Process2Instruction,
    Process3Instruction,
    Process4Instruction,
];
export const instructionsByClassName = {};
export default instructionsByClassName;

export const instructionsByName = {};
for (const inst of allInstructions) {
    instructionsByClassName[inst.name] = inst
    instructionsByName[inst.instructionName] = inst;
}
