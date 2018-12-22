String.prototype.count=function(s1) { 
  return (this.length - this.replace(new RegExp(s1,"g"), '').length) / s1.length;
}

const fs = require('fs');
const fileContent = fs.readFileSync('./dictionary.txt', { encoding: 'utf8' })

const lines = fileContent.split('\n').map(line => line.slice(0, -1));

const givenFlag = 'HLALK_DBEDSZSBSL_VZJL_Z_PZP';

const dictionary = {}

lines.forEach(line => {
  if (dictionary[line[0]]) {
    dictionary[line[0]].push(line);
  } else {
    dictionary[line[0]] = [line];
  }
});

const splitByUnderscore = givenFlag.split('_');

const flagDic = {}

splitByUnderscore.forEach(line => {
  for (let index = 0; index < line.length; index++) {   
    if (flagDic[line[index]]) {
      flagDic[line[index]]++;
    } else {
      flagDic[line[index]] = 1;
    } 
  }
});

console.log('--------------------------------------------')
console.log(`Amount of words in flag: ${splitByUnderscore.length}`)
console.log(`Words in flag: ${JSON.stringify(splitByUnderscore)}`);
console.log('--------------------------------------------')
console.log(`Length of dictionary: ${lines.length}`)
console.log('--------------------------------------------')
console.log(`Flag dictionary: ${JSON.stringify(flagDic)}`)
console.log('--------------------------------------------')
const searchByLength = length => line => line.length === length;
const dictionaryByLengths = {};
splitByUnderscore.forEach(word => {
  dictionaryByLengths[word] = [];
  dictionaryByLengths[word] = lines.filter(searchByLength(word.length));

  console.log(`Cur Word: ${word} | Filtered Lengths Amount: ${dictionaryByLengths[word].length}`)
})

console.log('--------------------------------------------')

const attempt = dictionaryByLengths['PZP'].filter(word => {
  return word[0] === word[2];
})

console.log(attempt);
0120343536
// flag{NEVER_SUBSTITUTE_LIKE_I_DID}

// Object.keys(dictionary).forEach(d => {
//   console.log(d + ':' + dictionary[d].length)
// })


// 14141_2212343234_1414_4_242
