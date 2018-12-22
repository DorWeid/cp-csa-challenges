
var fs = require('fs');

const zips = fs.readFileSync('../archives/zip/zips.txt', 'utf8').toString().split("\n");
const rars = fs.readFileSync('../archives/rar/rars.txt', 'utf8').toString().split("\n");

const parse = line => {
  const firstSplit = line.split(' ');
  let file_name = firstSplit[1];

  if (file_name && file_name.split('.').length === 2) {
    file_name = file_name.split('.')[1];
  }

  const secondSplit = firstSplit[0].split(',');
  const character = secondSplit[0];
  const offset = secondSplit[1];

  return {
    file_name: file_name ? file_name : ' ',
    character,
    offset
  }
};

const parsedZips = zips.map(parse);
const parsedRars = rars.map(parse).filter((row, idx) => idx > 3);

const concated = [...parsedZips, ...parsedRars];
// const a = concated.find(l => l.file_name == '1547');
//  const b = concated.filter(l => l.file_name == '0');
//  const c = concated.find(l => l.file_name == '192');
// console.log(a)
//  console.log(b)
//  console.log(c)
//  return;

// const c = concated.filter(l => l.file_name == '0');
// console.log(c);
// return;

const startingPar = concated.find(line => line.file_name === '0');
const endingPar = concated.find(line => line.character === '}');

let flag = 'W';
let curCharacter = startingPar;

while (flag[flag.length - 1] !== '}') {
  // Find next file name
  const nextOffset = parseInt(curCharacter.file_name) + parseInt(curCharacter.offset);

  console.log(`Searching for the next file: ${nextOffset}.`);

  // Attempt to find the next character using the nexr offset
  curCharacter = concated.find(l => parseInt(l.file_name) === nextOffset);

  // If couldnt find the next 
  if (!curCharacter) { 
    console.log(`Could not find next char at ${nextOffset}.`)
    return;
  }

  // If reached here, means we found next char
  flag = flag.concat(curCharacter.character);

  console.log(`Current Flag: ${flag}`);
}

// {xRgBfsCayCITNHnbloa}