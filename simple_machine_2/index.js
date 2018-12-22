const fs = require('fs');
const path = require('path');
var readline = require('readline-sync');

const machineCode = fs.readFileSync(path.resolve(__dirname, 'machine.bin'));

let out = '';
let readamount = 0;

const someFunc = (a,b) => {
  let arr = [];

  const f = (a,b) => {
    if (a == 0) {
      return b;
    }
    if (b == 0) {
      return a;
    }
    if (a==b) {
      return 0;
    }
  
    xres1 = Math.floor(a / 2);
    xres2 = a % 2;
    yres1 = Math.floor(b / 2);
    yres2 = b % 2;
  
    res2 = (yres2 + xres2) % 2;
    arr.push(res2);
  
    return f(yres1, xres1);
  }

  let res1 = f(a,b);

  for (let index = arr.length - 1; index >= 0; index--) {
    const element = arr[index];

    res1 = res1 * 2 + element;
  }

  return res1;
}

const brute = (b, res) => {
  for (let index = 1; index <= 127; index++) {
    if (someFunc(index, b) === res) {
      return index;
    }
  }
}

const opcodes = {
  0x00: {
    label: 'Add',
    action: function() {
      console.log('Add')
      const a = this.stack.pop();
      const b = this.stack.pop();
      this.stack.push(a+b);
      this.instructionPointer++;
    }
  },
  0x01: {
    label: 'Subtract',
    action: function() {
      let a = this.stack.pop();
      let b = this.stack.pop();

      // if (a > 127) {
      //   a = 255 - a;
      // }

      // if (b > 127) {
      //   b = 255 - b;
      // }
      let res;
      if (a < b) {
        // res = 256 + (a - b)
        res = a-b;
      } else {
        res = a - b;
      }

      this.stack.push(res);
      this.instructionPointer++;      
    }
  },
  0x02: {
    label: 'Divide',
    action: function() {
      const a = this.stack.pop();
      const b = this.stack.pop();
      this.stack.push(Math.floor(a / b));
      this.stack.push(a % b);
      this.instructionPointer++;
    }
  },
  0x03: {
    label: 'Multiply',
    action: function() {
      let a = this.stack.pop();
      let b = this.stack.pop();

      // if (a > 127) {
      //   a = 255 - a;
      // }
      
      // if (b > 127) {
      //   b = 255 - b;
      // } 

      this.stack.push(a * b);
      this.instructionPointer++;      
    }
  },
  0x08: {
    label: 'Read',
    action: function() {
      // const byte = readline.question('Insert Byte: ');
      // const v = isNaN(byte) ? byte.charCodeAt(0) : byte;
      // this.stack.push(v);
      // this.instructionPointer++;      
      // readamount++;

      if (readamount === 0) {
        this.stack.push(102);
      } else if (readamount === 1) {
        this.stack.push(108)
      } else if (readamount === 2) {
        this.stack.push(97)
      } else if (readamount === 3) {
        this.stack.push(103)
      }

      this.instructionPointer++;      
      readamount++;
    }
  },
  0x09: {
    label: 'Write',
    action: function() {
      out += String.fromCharCode(this.stack.pop());
      this.instructionPointer++;      
    }
  },
  0x20: {
    label: 'Pop',
    action: function() { 
      this.stack.pop();  
      this.instructionPointer++;      
    }
  },
  0x10: {
    label: 'Jump',
    action: function () {
      let offset = this.stack.pop();
      // if (pop > 127) {
      //   offset = 255 - pop;
      // }
      this.instructionPointer = this.instructionPointer + offset + 1;
      console.log(`Jump, ${this.instructionPointer}`)
    }
  },
  0x11: {
    label: 'Call',
    action: function () {
      let offset = this.stack.pop();

      // if (offset > 127) {
      //   offset = 255 - offset;
      // }

      this.stack.push(this.instructionPointer + 1);
      this.instructionPointer = this.instructionPointer + offset + 1;
      console.log(`Call, ${this.instructionPointer}`)
    }
  },
  0x12: {
    label: 'Ret',
    action: function () {
      this.instructionPointer = this.stack.pop();
    }
  },
  0x14: {
    label: 'CJE',
    action: function() {
      let offset = this.stack.pop();
      // if (offset > 127) {
      //   offset = 255 - offset;
      // }
      if (this.stack.pop() === this.stack.pop()) {
        console.log(`CJE, ${offset}`)
        this.instructionPointer = this.instructionPointer + offset + 1;
      } else {
        this.instructionPointer++;
      }
    }
  },
  0x18: {
    label: 'JSE',
    action: function() {
      const offset = this.stack.pop();
      if (this.stack.empty()) {
        this.instructionPointer = this.instructionPointer + offset + 1;
      } else {
        this.instructionPointer++;
      }
    }
  }
}

class Stack {
  constructor() {
    this.data = [];
    
    this.push = this.push.bind(this);
    this.pop = this.pop.bind(this);
    this.load = this.load.bind(this);
  }

  push(value) {
    this.data.unshift(value ? value : 0);
  }

  pop() {
    return this.data.shift();
  }

  empty() {
    return !this.data.length;
  }

  swap(offset) {
    let temp = this.data[offset];
    this.data[offset] = this.data[0];
    this.data[0] = temp;
  }

  load(offset) {
    this.push(this.data[offset]);
  }

  getByIndex(index) {
    return this.data[index];
  }
}

class Interpreter {
  constructor(machineCode) {
    this.machineCode = [...machineCode];

    this.interpret = this.interpret.bind(this);
  }

  interpret() {
    return this.machineCode.map(this.interpretByte);
  }

  interpretByte(byte) {
    if (opcodes[byte]) {
      return opcodes[byte];
    }

    if (byte >= 0x80) {
      return { label: 'Push', value: byte-0x80, action: function(value) { this.stack.push(value); this.instructionPointer++; } };
    }

    if (byte >= 0x40 && byte <= 0x7f) { 
      return { label: 'Load', value: byte-0x40, action: function(value) { this.stack.load(value);  this.instructionPointer++; }  }
    }

    if (byte >= 0x21 && byte <= 0x3f) {
      return { label: 'Swap', value: byte-0x20, action: function(value) { this.stack.swap(value);  this.instructionPointer++; } }
    }
  }
}

class SimpleMachine2 {
  constructor(interpretedCode) {
    this.instructionPointer = 0;
    this.stack = new Stack();
    this.interpretedCode = interpretedCode;

    this.printProgram = this.printProgram.bind(this);
    this.executeProgram = this.executeProgram.bind(this);
    this.executeLine = this.executeLine.bind(this);
  }

  executeProgram() {
    while (this.instructionPointer <= 37) {
      const currentLine = this.interpretedCode[this.instructionPointer];
      console.log(`IP: ${this.instructionPointer}`)
      console.log(`Line: ${currentLine.label}. Value: ${currentLine.value}`)
      console.log(`---------------------`)
        
      this.executeLine(currentLine);
    }

    while (!this.stack.empty()) {
      const top = this.stack.pop();
      const res = this.stack.pop();
      this.stack.push(res);
      const a = brute(top, res);
      out += String.fromCharCode(a);
    }

    return;
    try {
      while (this.instructionPointer >= 0  && this.instructionPointer < this.interpretedCode.length) {
        const currentLine = this.interpretedCode[this.instructionPointer];
        console.log(`IP: ${this.instructionPointer}`)
        console.log(`Line: ${currentLine.label}. Value: ${currentLine.value}`)
      console.log(`---------------------`)
        
        this.executeLine(currentLine);
      }

      console.log(`Finished running program. IP: ${this.instructionPointer}. Stack Length: ${this.stack.data.length}`)
      console.log(`Output: ${out}`)
      console.log('read amount ', readamount)
      // this.stack.data.forEach(s => {
      //   console.log(String.fromCharCode(s));
      // })
    } catch (e) {
      console.log(e);
    }
  }

  executeLine(line) {
    if (line.value || line.value === 0) {
      line.action.call(this, line.value);
    } else {
      line.action.call(this);
    }
  }

  printProgram() {
    let c = 0;
    this.interpretedCode.forEach(line => {
      if (line.value) {
        console.log(`${c}. ${line.label} ${line.value}`);
      } else {
        console.log(`${c}. ${line.label} `);
      }
      c++;
    })
  }
}

const interpreter = new Interpreter(machineCode);

const example = [
  { label: 'Push', value: 2, action: function(value) { this.stack.push(value); this.instructionPointer++; }},
  { label: 'Push', value: 0x7f, action: function(value) { this.stack.push(value); this.instructionPointer++; }},
  opcodes[0x08],
  { label: 'Push', value: 0x0A, action: function(value) { this.stack.push(value); this.instructionPointer++; }},
  opcodes[0x11],
  opcodes[0x02],
  { label: 'Swap', value: 1, action: function(value) { this.stack.swap(value);  this.instructionPointer++; } },
  opcodes[0x09],
  opcodes[0x20],
  { label: 'Push', value: 0x0c, action: function(value) { this.stack.push(value); this.instructionPointer++; }},
  opcodes[0x18],
  { label: 'Push', value: 0x4, action: function(value) { this.stack.push(value); this.instructionPointer++; }},
  { label: 'Push', value: 0x0, action: function(value) { this.stack.push(value); this.instructionPointer++; }},
  opcodes[0x01],
  opcodes[0x11],
  { label: 'Load', value: 2, action: function(value) { this.stack.load(value);  this.instructionPointer++; }  },
  { label: 'Load', value: 2, action: function(value) { this.stack.load(value);  this.instructionPointer++; }  },
  opcodes[0x00],
  { label: 'Swap', value: 3, action: function(value) { this.stack.swap(value);  this.instructionPointer++; } },
  opcodes[0x20],
  { label: 'Swap', value: 1, action: function(value) { this.stack.swap(value);  this.instructionPointer++; } },
  opcodes[0x20],
  opcodes[0x12],
  { label: 'Push', value: 0x44, action: function(value) { this.stack.push(value); this.instructionPointer++; }},
  { label: 'Push', value: 0x4e, action: function(value) { this.stack.push(value); this.instructionPointer++; }},
  { label: 'Push', value: 0x45, action: function(value) { this.stack.push(value); this.instructionPointer++; }},
  { label: 'Push', value: 0x20, action: function(value) { this.stack.push(value); this.instructionPointer++; }},
  opcodes[0x09],
  opcodes[0x09],
  opcodes[0x09],
  opcodes[0x09],
]

const sm2 = new SimpleMachine2(interpreter.interpret());
//  sm2.printProgram();
sm2.executeProgram();