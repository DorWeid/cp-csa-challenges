const fs = require('fs');

const fileParser = () => {
  const origin = fs.readFileSync('/Users/dorweidman/Documents/CP_Challenges/trace_me_if_u_can/b23456.txt', { encoding: 'utf-8'}).split('\n')
  
  const relevant = origin.slice(56133,185777);


  const onlyOmerCode = [];
  let irr = 0;

  for (let index = 0; index < relevant.length; index++) {
    const element = relevant[index];
    
    if (element.includes('/usr/lib/go') && !element.includes('Returning')) {
      irr++; 
    } else if (element.includes('Returning')) {
      irr--;
    } else {
      if (!irr)
        onlyOmerCode.push(element);
    }
  }

  const o = {};

  for (let index = 0; index < origin.length; index++) {
    const element = origin[index];
    if (element.includes(' #')) {
      const split = element.split(' ');
      const varName= split[1];
      const idk = split[split.length-1];
      
      if (!o[varName]) {
        o[varName] = idk;
      }
    }
  }

  var file = fs.createWriteStream('array.txt');
  Object.keys(o).forEach(function(v) {
    file.write(v + ':' + o[v]+ '\n'); 
  });
  file.end();

}

const hashes = () => {
  const sha256 = require('sha256');
  
  const wanted = '6d048395c5e26049771bcdc5813ed8917f2c0381c1098c9ef8b2125b0d4fe5c6';

  const suffix = 'McITEHC8fUMq81Ae';
  const availChars = [];

  for (let index = 65; index <= 90; index++) {
    availChars.push(String.fromCharCode(index))
  }

  for (let index = 97; index <= 122; index++) {
    availChars.push(String.fromCharCode(index))
  }

  for (let index = 0; index <= 9; index++) {
    availChars.push(index.toString())
  }

  for (let a = 0; a < availChars.length; a++) {
    for (let b = 0; b < availChars.length; b++) {
      for (let c = 0; c < availChars.length; c++) {
        for (let d = 0; d < availChars.length; d++) {
          const b4 = availChars[a]+availChars[b]+availChars[c]+availChars[d]+suffix;
          let hash = sha256(b4);
          if (hash === wanted) {
            console.log(availChars[a] + availChars[b]+ availChars[c]+ availChars[d])
          }
        }
      }
    } 
  }
}

const main = () => {
  fileParser();
}

main();