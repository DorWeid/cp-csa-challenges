const _ = require('lodash');

const exampleString = '0,[0, 12, 2, 18]; 1,[0, 7, 6, 19]; 2,[5, 0, 0, 19]; 3,[6, 2, 9, 10]; 4,[14, 0, 5, 10]; 5,[7, 12, 0, 0]; 6,[0, 0, 18, 7]; 7,[0, 17, 9, 7]; 8,[0, 0, 14, 17]';
const borderString = '0,[0,1,2,0]; 1,[0,0,2,3]; 2,[1,1,0,0]; 3,[1,0,0,1]';
const real = '0,[3, 11, 14, 3]; 1,[14, 7, 0, 18]; 2,[5, 19, 0, 8]; 3,[0, 10, 4, 1]; 4,[17, 8, 6, 3]; 5,[12, 19, 20, 9]; 6,[6, 9, 18, 4]; 7,[8, 8, 8, 16]; 8,[5, 4, 16, 7]; 9,[1, 14, 8, 0]; 10,[9, 0, 1, 19]; 11,[13, 2, 0, 10]; 12,[1, 5, 4, 5]; 13,[18, 0, 15, 14]; 14,[9, 6, 10, 0]; 15,[3, 7, 6, 12]; 16,[5, 5, 7, 1]; 17,[15, 18, 0, 0]; 18,[19, 6, 11, 3]; 19,[12, 3, 19, 2]; 20,[11, 8, 2, 14]; 21,[0, 16, 1, 18]; 22,[16, 0, 15, 2]; 23,[13, 14, 1, 16]; 24,[9, 6, 11, 6]; 25,[0, 20, 7, 14]; 26,[20, 8, 17, 16]; 27,[8, 9, 6, 5]; 28,[9, 10, 16, 0]; 29,[20, 8, 11, 5]; 30,[6, 15, 0, 6]; 31,[14, 1, 17, 15]; 32,[4, 0, 3, 20]; 33,[16, 6, 1, 4]; 34,[14, 8, 15, 6]; 35,[6, 14, 8, 1]; 36,[16, 7, 20, 16]; 37,[0, 19, 12, 1]; 38,[6, 14, 17, 20]; 39,[8, 6, 11, 11]; 40,[19, 8, 8, 20]; 41,[11, 1, 6, 2]; 42,[6, 11, 20, 5]; 43,[10, 7, 1, 5]; 44,[14, 20, 8, 9]; 45,[16, 13, 3, 8]; 46,[1, 19, 19, 5]; 47,[16, 19, 3, 0]; 48,[7, 5, 13, 0]; 49,[1, 9, 5, 20]; 50,[18, 7, 10, 11]; 51,[17, 12, 4, 3]; 52,[4, 17, 6, 9]; 53,[14, 7, 9, 6]; 54,[13, 0, 3, 13]; 55,[18, 6, 9, 7]; 56,[7, 8, 1, 0]; 57,[7, 0, 0, 18]; 58,[0, 7, 4, 20]; 59,[16, 10, 19, 3]; 60,[16, 3, 7, 9]; 61,[17, 6, 2, 17]; 62,[15, 7, 1, 8]; 63,[0, 6, 7, 0]; 64,[0, 8, 8, 15]; 65,[7, 1, 8, 6]; 66,[0, 4, 5, 6]; 67,[5, 1, 12, 13]; 68,[5, 2, 16, 13]; 69,[3, 10, 9, 5]; 70,[12, 6, 0, 7]; 71,[3, 7, 17, 11]; 72,[7, 6, 16, 14]; 73,[2, 18, 15, 0]; 74,[0, 0, 3, 10]; 75,[11, 16, 6, 4]; 76,[11, 7, 0, 18]; 77,[8, 3, 0, 1]; 78,[19, 3, 0, 14]; 79,[7, 12, 1, 4]; 80,[9, 5, 3, 3]; 81,[0, 13, 3, 1]; 82,[6, 3, 5, 16]; 83,[1, 11, 9, 0]; 84,[20, 10, 1, 8]; 85,[11, 6, 0, 13]; 86,[14, 8, 0, 20]; 87,[20, 0, 6, 11]; 88,[1, 11, 6, 8]; 89,[11, 19, 11, 16]; 90,[16, 14, 15, 17]; 91,[19, 13, 6, 9]; 92,[1, 14, 11, 8]; 93,[16, 12, 8, 7]; 94,[9, 18, 13, 11]; 95,[19, 7, 6, 13]; 96,[9, 16, 12, 6]; 97,[3, 3, 20, 6]; 98,[18, 7, 13, 5]; 99,[19, 9, 6, 11]';

class Board {
  constructor(entireString) {
    this.board = [];
    this.mapToBoard(entireString);
    this.mapToBoard = this.mapToBoard.bind(this);
    this.isBorderValid = this.isBorderValid.bind(this);
    this.solveBoard = this.solveBoard.bind(this);
    this.buildCorners = this.buildCorners.bind(this);
    this.recursion = this.recursion.bind(this);
  }

  mapToBoard(entireString) {
    const split = entireString.split(';');

    const length = Math.sqrt(split.length);

    for (let i = 0; i < length; i++) {
      this.board[i] = [];

      for (let j = 0; j < length; j++) {
        const cur = split[i * length + j];
        const parIndex = cur.indexOf('[');
        const pieceString = cur.substring(parIndex, cur.length);
        const pieceId = cur.substring(0, parIndex - 1);

        this.board[i].push(new Piece(pieceId, pieceString));
      }      
    }
  }

  isBorderValid(board) {
    // top left
    if (board[0][0].top !== 0 || board[0][0].left !== 0) return false;

    // bottom left
    if (board[board.length - 1][0].bottom !== 0 || board[board.length - 1][0].left !== 0) return false;

    // bottom right
    if (board[board.length - 1][board.length - 1].bottom !== 0 || board[board.length - 1][board.length - 1].right !== 0) return false;

    // top right
    if (board[0][board.length - 1].top !== 0 || board[0][board.length - 1].right !== 0) return false;
    
    for (let index = 0; index < board.length; index++) {
      if (board[0][index].top !== 0) return false; // top
      if (board[index][0].left !== 0) return false; // left
      if (board[index][board.length - 1].right !== 0) return false;  // right
      if (board[board.length - 1][index].bottom !== 0) return false; // bottom
    }

    return true;
  }

  isBoardValid(board) {
    for (let i = 1; i < board.length; i++) {
      for (let j = 1; j < board.length; j++) {
        if (board[i][j-1].right !== board[i][j].left || board[i-1][j].bottom !== board[i][j].top) {
          return false;
        }
      }
    }

    return true;
  }

  getCorners(board) {
    const arr = [];
    for (const p of board) {
      if (p.isCornerBorderPiece) arr.push(p);
    }

    if (arr.length !== 4) {
      throw new Error('Board should have 4 corners');
    }

    return arr;
  }

  findCubeById(id) {
    for (const row of this.board) {
      let o = row.find(p => p.id === id);

      if (o) return o;
    }
  }


  recursion() {
    let origin = _.flatten(this.board);
    let candidates = [...origin];

    // array with an extra row/col 
    let begin = this.init2dArray(this.board.length + 2);

    // initialize outer pieces with 0's
    for (let i = 0; i < begin.length; i++) {
      for (let j = 0; j < begin.length; j++) {
        if (i === 0 || j === 0 || i === begin.length - 1 || j === begin.length - 1) {
          begin[i][j] = new Piece(-1, '[0,0,0,0]');
        }
      }  
    }

    const f = (board, pieces, i, j) => {
      const bottom = board[i-1][j].bottom;
      const right = board[i][j-1].right;

      // find possible candidates
      let candidates = pieces.filter(c => c.isPossible({bottom, right}));

      for (const candidate of candidates) {
        // new board assignment
        let newBoard = [...board];
        
        // ror until matches (there is always supposed to be a match if piece is a candidate)
        while (candidate.top !== bottom || candidate.left !== right) {
          candidate.ror();
        }

        // remove candidate from pieces
        let newPieces = pieces.filter(p => p.id !== candidate.id);
        
        // place candidate in new potential board
        newBoard[i][j] = candidate;

        // bottom right corner, we are done        
        if (j === begin.length - 2 && i === begin.length - 2) {
          console.log(this.getBoardSolution(newBoard))
          return newBoard;  
        }

        // end of row, move to next row
        if (j === newBoard.length - 2) {
          f(newBoard, newPieces, i + 1, 1);        
        } else {
          f(newBoard, newPieces, i, j+1);
        }
      }
    }
    
    const solvedBoard = f(begin, candidates, 1, 1);

    return this.getBoardSolution(solvedBoard);
  }


  solveBoard() {
    let origin = _.flatten(this.board);
    let flag = false;
    let iterations = 1;

    let candidates = [...origin];
    let corners = this.getCorners(candidates);
    let borderPieces = this.findBorders(candidates);

    candidates = this.removeUsedPieces(candidates, corners);
    candidates = this.removeUsedPieces(candidates, borderPieces);

    while (true) {
      try {
        iterations++;
        corners = _.shuffle(corners);
        borderPieces = _.shuffle(borderPieces);
        let attempt1 = this.buildCorners(corners);
        attempt1 = this.buildBorder(attempt1, borderPieces);

      let r = this.isBoardValid(attempt1);
      } catch (e) {
        console.log('invalid')
      }
      
    }

    while (!flag) {
      try {
        corners = _.shuffle(corners);
        borderPieces = _.shuffle(borderPieces);

        // Begin solving puzzle by building the corners first
        let attempt1 = this.buildCorners(corners);

        // Place the rest of the border
        attempt1 = this.buildBorder(attempt1, borderPieces);

        if (this.isBorderValid(attempt1)) {
          let innerCandids = _.shuffle(candidates);
          
          for (let index = 0; index < 10 && !flag; index++) {
            attempt1 = this.solveInnerBoard(attempt1, innerCandids);
            
            if (this.isBoardValid(attempt1)) {
              flag = true;
              const sol = this.getBoardSolution(attempt1);
              console.log(sol);
            } 
          }
        }
        

        // if (this.isBorderValid(attempt1)) {
        //   flag = true;          
        //   let innerFlag = false;

        //   while (!innerFlag) {
        //     try {
        //       let innerCandids = _.shuffle(candidates);

        //       attempt1 = this.solveInnerBoard(attempt1, innerCandids);

        //       if (this.isBoardValid(attempt1)) {
        //         innerFlag = true;

        //         const sol = this.getBoardSolution(attempt1);
        //         console.log(sol);
        //       }
        //     } catch (e) {
        //       console.log(e.message);
        //     }
        //   }
        // }
      } catch (e) {
        if (e.message !== 'Could not find match for border. Shuffling...') {
          console.log(iterations++ + '. ' +e.message);
        }
      }
    }
  }

  solveInnerBoard(board, candidates) {
    // Start placing pieces from left to right, top to bottom.
    for (let i = 1; i < board.length - 1; i++) {
      for (let j = 1; j < board.length - 1; j++) {
        let top = board[i-1][j];
        let left = board[i][j-1];
        const matching = candidates.filter(c => c.includesNum(left.right) && c.includesNum(top.bottom));
        
        let found = false;

        for (const match of matching) {
          for (let j = 0; j < 4 && !found; j++) {
            if (match.left === left.right && match.top === top.bottom) {
              found = true;
            } else {
              match.ror();
            }
          }

          if (found) {
            // Remove matching piece from available pieces
            candidates = candidates.filter(c => c.id !== match.id);
            board[i][j] = match;

            break;
          }
        }

        // Iterated over all candidates but none match
        if (!found) {
          throw new Error('Could not find match for inner board. Shuffling...');
        }
      }      
    }

    return board;
  }

  buildBorder(board, candidates) {
    // Top
    for (let i = 1; i < board.length - 1; i++) {
      const matching = candidates.filter(c => c.includesNum(board[0][i-1].right));

      if (!matching.length) throw new Error('Could not find match for border. Shuffling...');

      // TODO: For now, arbitrary selects index 0 from matching candidates.

      let found = false;

      for (const match of matching) {
        while (match.top !== 0) {
          match.ror();
        }

        if (match.left === board[0][i-1].right) {
          found = true;

          // Remove matching piece from available pieces
          candidates = candidates.filter(c => c.id !== match.id);
          board[0][i] = match;

          break;
        }
      }
      
      // Iterated over all candidates but none match
      if (!found) {
        throw new Error('Could not find match for border. Shuffling...');
      }
    }

    // Bottom
    for (let i = 1; i < board.length - 1; i++) {
      const matching = candidates.filter(c => c.includesNum(board[board.length - 1][i-1].right));

      if (!matching.length) throw new Error('Could not find match for border. Shuffling...');
      
      // TODO: For now, arbitrary selects index 0 from matching candidates.

      let found = false;

      for (const match of matching) {
        while (match.bottom !== 0) {
          match.ror();
        }

        if (match.left === board[board.length - 1][i-1].right) {
          found = true;

          // Remove matching piece from available pieces
          candidates = candidates.filter(c => c.id !== match.id);
          board[board.length - 1][i] = match;

          break;
        }
      }
      
      // Iterated over all candidates but none match
      if (!found) {
        throw new Error('Could not find match for border. Shuffling...');
      }
    }

    // Left
    for (let i = 1; i < board.length - 1; i++) {
      const matching = candidates.filter(c => c.includesNum(board[i-1][0].bottom));

      if (!matching.length) throw new Error('Could not find match for border. Shuffling...');
      
      // TODO: For now, arbitrary selects index 0 from matching candidates.

      let found = false;

      for (const match of matching) {
        while (match.left !== 0) {
          match.ror();
        }

        if (match.top === board[i - 1][0].bottom) {
          found = true;

          // Remove matching piece from available pieces
          candidates = candidates.filter(c => c.id !== match.id);
          board[i][0] = match;

          break;
        }
      }
      
      // Iterated over all candidates but none match
      if (!found) {
        throw new Error('Could not find match for border. Shuffling...');
      }
    }

    // Right
    for (let i = 1; i < board.length - 1; i++) {
      const matching = candidates.filter(c => c.includesNum(board[i-1][board.length - 1].bottom));

      if (!matching.length) throw new Error('Could not find match for border. Shuffling...');
      
      // TODO: For now, arbitrary selects index 0 from matching candidates.

      let found = false;

      for (const match of matching) {
        while (match.right !== 0) {
          match.ror();
        }

        if (match.top === board[i-1][board.length-1].bottom) {
          found = true;

          // Remove matching piece from available pieces
          candidates = candidates.filter(c => c.id !== match.id);
          board[i][board.length-1] = match;

          break;
        }
      }
      
      // Iterated over all candidates but none match
      if (!found) {
        throw new Error('Could not find match for border. Shuffling...');
      }
    }

    return board;
  }

  removeUsedPieces(candidates, piecesToRemove) {
    return candidates.filter(p => {
      return !piecesToRemove.find(r => r.id === p.id);
    });
  }

  init2dArray(dim) {
    const a = [];
    for (let index = 0; index < dim; index++) {
      a[index] = [];
    }

    return a;
  }

  // Given ORDERED corners, returns the initial board with 4 pieces
  buildCorners(corners) {
    const newBoard = this.init2dArray(this.board.length);

    newBoard[0][0] = corners[0]; // top left
    newBoard[0][newBoard.length - 1] = corners[1]; // top right
    newBoard[newBoard.length - 1][newBoard.length - 1] = corners[2]; // bottom right
    newBoard[newBoard.length - 1][0] = corners[3]; // bottom left

    while (newBoard[0][0].top !== 0 || newBoard[0][0].left !== 0) newBoard[0][0].ror(); 
    while (newBoard[0][newBoard.length - 1].top !== 0 || newBoard[0][newBoard.length - 1].right !== 0) newBoard[0][newBoard.length - 1].ror(); 
    while (newBoard[newBoard.length - 1][newBoard.length - 1].bottom !== 0 || newBoard[newBoard.length - 1][newBoard.length - 1].right !== 0) newBoard[newBoard.length - 1][newBoard.length - 1].ror(); 
    while (newBoard[newBoard.length - 1][0].bottom !== 0 || newBoard[newBoard.length - 1][0].left !== 0) newBoard[newBoard.length - 1][0].ror(); 

    return newBoard;
  }

  findBorders(candidates) {
    return candidates.filter(c => c.isBorderPiece);
  }

  getBoardSolution(board) {
    let output = '';

    for (const row of board) {
      for (const piece of row) {
        if (piece.id === -1) continue;
        output += `${piece.id},${piece.shifts}; `
      }
    }

    return output.slice(0, -2);
  }
}

class Piece {
  constructor(pieceId, pieceString) {
    this.id = parseInt(pieceId, 10);
    this.shifts = 0;

    this.processString(pieceString);

    this.ror = this.ror.bind(this);
    this.processString = this.processString.bind(this);
    this.isPossible = this.isPossible.bind(this);
  }
  
  // String should look like an array representation: [1, 2, 3, 4]  
  processString(pieceString) {
    const parsed = JSON.parse(pieceString);
    this.parsed = parsed;

    this.top = parseInt(parsed[0], 10);
    this.right = parseInt(parsed[1], 10);
    this.bottom = parseInt(parsed[2], 10);
    this.left = parseInt(parsed[3], 10);

    this.isBorderPiece = parsed.filter(cur => cur === 0).length === 1;
    this.isCornerBorderPiece = parsed.filter(cur => cur === 0).length === 2;
  }
  
  // rotate clockwise
  ror() {
    const temp = this.top;
    this.top = this.left;
    this.left = this.bottom;
    this.bottom = this.right;
    this.right = temp;

    this.shifts = this.shifts + 1 === 4 ? 0 : this.shifts + 1;
  }

  includesNum(n) {
    return (this.top === n || this.bottom === n || this.left === n || this.right === n);
  }

  isPossible(o) {
    const { top, bottom, right, left, parsed } = this;
    const p = new Piece(-1, JSON.stringify(parsed))

    for (let index = 0; index < 4; index++) {
      if (o.right === p.left && o.bottom === p.top) {
        return true;
      }

      p.ror();
    }

    return false;
  }
}

// const board = new Board(exampleString);
// console.log(board.recursion());

const realBoard = new Board(real);
realBoard.recursion();