import { invariant } from "../../../optdisco/js/utils";
import { LightBox } from "./box";
import { directions } from "./constants";
import instructions from './instructions';

export class Bot {
  constructor(map, position, direction) {
    this.map = map;
    invariant('x' in position && 'y' in position);
    invariant(Object.values(directions).includes(direction));
    this.startingPos = {...position}; // save initial position for reset
    this.currentPos = {...position}; // current bot position on the map
    this.startingDirection = direction; // save initial direction for reset
    this.direction = direction; // current direction the bot is facing
    this.reset();
    this.initView();
  }
  reset() {
    this.currentPos = {...this.startingPos};
    this.direction = this.startingDirection;
    this.instructionQueue = [];
    this.executionQueue = [];
    this.trajectory = [{position: {...this.startingPos}, direction: this.startingDirection}];
    this.executionMode = false;
    this.actionCounter = 0;
  }

  clearExecutionQueue() {
    this.executionQueue = [];
  }

  queueInstruction(instruction) {
    this.instructionQueue.push(instruction);
  }
  queueInstructions(instructions) {
    this.instructionQueue = this.instructionQueue.concat(instructions)
  }

  hasNextInstruction() {
    return this.executionQueue.length > 0;
  }

  execute() {
    this.executionMode = true;
    this.executionQueue = Array.from(this.instructionQueue); // copy instructionQueue into executionQueue
  }

  recordAction() {
    this.actionCounter++;
    this.trajectory.push({position: {...this.currentPos}, direction: this.direction});
  }

  // executes and returns the next instruction
  executeNextInstruction() {
    if (!this.executionQueue.length) {
      console.error('Bot executeNextInstruction: no instruction to execute');
      return null;
    }

    const instruction = this.executionQueue.shift();

    switch (instruction.name) {
      case instructions.WalkInstruction.instructionName:
        this.walk();
        this.recordAction();
        break;
      case instructions.JumpInstruction.instructionName:
        this.jump();
        this.recordAction();
        break;
      case instructions.LightInstruction.instructionName:
        this.light();
        this.recordAction();
        break;
      case instructions.TurnLeftInstruction.instructionName:
        this.turnLeft();
        this.recordAction();
        break;
      case instructions.TurnRightInstruction.instructionName:
        this.turnRight();
        this.recordAction();
        break;
      /*
    case instructions.RepeatInstruction.instructionName:
      if (instruction.counter > 1) {
        instruction.counter--;
        this.executionQueue.unshift(instruction);
      }
      for (var i = instruction.body.length - 1; i >= 0 ; i--) {
        var tmp = instruction.body[i];
        var tmp2 = $.extend(true, {}, tmp); // deep copy of object as explained here: http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-a-javascript-object
        this.executionQueue.unshift(tmp2);
      }
      return this.executeNextInstruction();
      break;
      case instructions.Process4Instruction.instructionName:
        for (var i = instruction.body.length - 1; i >= 0; i--) {
          var tmp = instruction.body[i];
          var tmp2 = $.extend(true, {}, tmp); // deep copy of object as explained here: http://stackoverflow.com/questions/122102/what-is-the-most-efficient-way-to-clone-a-javascript-object
          this.executionQueue.unshift(tmp2);
        }
        return this.executeNextInstruction();
        break;
      */
      case instructions.Process1Instruction.instructionName:
      case instructions.Process2Instruction.instructionName:
      case instructions.Process3Instruction.instructionName:
      case instructions.Process4Instruction.instructionName:
        this.executionQueue = instruction.body.concat(this.executionQueue);
        return this.executeNextInstruction();
      default:
        console.error('Bot executeNextInstruction: unknown instruction "' + instruction.name + '"');
        break;
    }
    return instruction;
  }

  walk() {
    switch (this.direction) {
      case directions.se:
        if (this.currentPos.y > 0 && this.map.mapRef[this.currentPos.x][this.currentPos.y].height === this.map.mapRef[this.currentPos.x][this.currentPos.y - 1].height) {
          this.currentPos.y--;
        }
        break;
      case directions.ne:
        if (this.currentPos.x + 1 < this.map.levelSize.x && this.map.mapRef[this.currentPos.x][this.currentPos.y].height === this.map.mapRef[this.currentPos.x + 1][this.currentPos.y].height) {
          this.currentPos.x++;
        }
        break;
      case directions.nw:
        if (this.currentPos.y + 1 < this.map.levelSize.y && this.map.mapRef[this.currentPos.x][this.currentPos.y].height === this.map.mapRef[this.currentPos.x][this.currentPos.y + 1].height) {
          this.currentPos.y++;
        }
        break;
      case directions.sw:
        if (this.currentPos.x > 0 && this.map.mapRef[this.currentPos.x][this.currentPos.y].height === this.map.mapRef[this.currentPos.x - 1][this.currentPos.y].height) {
          this.currentPos.x--;
        }
        break;
      default:
        console.error('Bot walk: unknown direction "' + this.direction + '"');
        break;
    }
  }

  jump() {
    switch (this.direction) {
      case directions.se:
        if (this.currentPos.y > 0 && (this.map.mapRef[this.currentPos.x][this.currentPos.y - 1].height - this.map.mapRef[this.currentPos.x][this.currentPos.y].height === 1 || this.map.mapRef[this.currentPos.x][this.currentPos.y].height > this.map.mapRef[this.currentPos.x][this.currentPos.y - 1].height)) {
          this.currentPos.y--;
        }
        break;
      case directions.ne:
        if (this.currentPos.x + 1 < this.map.levelSize.x && (this.map.mapRef[this.currentPos.x + 1][this.currentPos.y].height - this.map.mapRef[this.currentPos.x][this.currentPos.y].height === 1 || this.map.mapRef[this.currentPos.x][this.currentPos.y].height > this.map.mapRef[this.currentPos.x + 1][this.currentPos.y].height)) {
          this.currentPos.x++;
        }
        break;
      case directions.nw:
        if (this.currentPos.y + 1 < this.map.levelSize.y && (this.map.mapRef[this.currentPos.x][this.currentPos.y + 1].height - this.map.mapRef[this.currentPos.x][this.currentPos.y].height === 1 || this.map.mapRef[this.currentPos.x][this.currentPos.y].height > this.map.mapRef[this.currentPos.x][this.currentPos.y + 1].height)) {
          this.currentPos.y++;
        }
        break;
      case directions.sw:
        if (this.currentPos.x > 0 && this.map.levelSize.x && (this.map.mapRef[this.currentPos.x - 1][this.currentPos.y].height - this.map.mapRef[this.currentPos.x][this.currentPos.y].height === 1 || this.map.mapRef[this.currentPos.x][this.currentPos.y].height > this.map.mapRef[this.currentPos.x - 1][this.currentPos.y].height)) {
          this.currentPos.x--;
        }
        break;
      default:
        console.error('Bot is facing unknown direction');
        break;
    }
  }

  light() {
    var tmp = this.map.mapRef[this.currentPos.x][this.currentPos.y];
    if (tmp instanceof LightBox) {
      tmp.toggleLight();
    }
  }

  turnLeft() {
    this.direction = (this.direction + 1) % 4;
  }

  turnRight() {
    this.direction--;
    if (this.direction < 0) {
      this.direction = 3;
    }
  }

  isInExecutionMode() {
    return this.executionMode;
  }

  /*
  getNumberOfInstructions() {
    //   function count(a) {
    //     var x = 0;
    //     for (var i = 0; i < a.length; i++) {
    //       x++;
    //       if (a[i] instanceof instructions.RepeatInstruction) {
    //         x += count(a[i].body);
    //       }
    //     }
    //     return x;
    //   }
    //   return count(this.instructionQueue);
    // }
    if (lightBot.ui.editor.getActions("program") == null) {
      console.log('null')
      programLength = 0;
    }
    else {
      programLength = lightBot.ui.editor.getActions("program").length;
    }
    if (condition.slice(0, 9) == 'hierarchy') {
      if (lightBot.ui.editor.getActions("p1") !== null) {
        p1Length = lightBot.ui.editor.getActions("p1").length;
        programLength = programLength + p1Length;
      }
      if (lightBot.ui.editor.getActions("p2") !== null) {
        p2Length = lightBot.ui.editor.getActions("p2").length;
        programLength = programLength + p2Length;
      }
      if (lightBot.ui.editor.getActions("p3") !== null) {
        p3Length = lightBot.ui.editor.getActions("p3").length;
        programLength = programLength + p3Length;
      }
      if (lightBot.ui.editor.getActions("p4") !== null) {
        p4Length = lightBot.ui.editor.getActions("p4").length;
        programLength = programLength + p4Length;
      }
    }
    return programLength
  }
  */
}

