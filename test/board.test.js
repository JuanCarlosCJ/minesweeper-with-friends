// Board rules tests. Run with: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const { createBoard, reveal, isWon, toggleFlag } = require('../server/game/board');

// Builds a board with mines exactly where we want them.
function boardWithMines(width, height, minePositions) {
  const board = createBoard(width, height, 0);
  for (const [x, y] of minePositions) {
    const cell = board.cells[y][x];
    cell.isMine = true;
    board.mines.push(cell);
  }
  board.mineCount = minePositions.length;
  for (const row of board.cells) {
    for (const cell of row) {
      cell.type = 0;
      for (const mine of board.mines) {
        if (Math.abs(mine.x - cell.x) <= 1 && Math.abs(mine.y - cell.y) <= 1 && mine !== cell) cell.type++;
      }
    }
  }
  return board;
}

test('creates a board with the requested size and mine count', () => {
  const board = createBoard(15, 10, 30);
  assert.equal(board.cells.length, 10);
  assert.equal(board.cells[0].length, 15);
  assert.equal(board.cells.flat().filter((c) => c.isMine).length, 30);
});

test('numbers count the mines around each cell', () => {
  const board = createBoard(20, 20, 80);
  for (const cell of board.cells.flat()) {
    if (cell.isMine) continue;
    let around = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (board.cells[cell.y + dy]?.[cell.x + dx]?.isMine) around++;
      }
    }
    assert.equal(cell.type, around);
  }
});

test('opening an empty area reveals it and counts each cell once', () => {
  const board = boardWithMines(5, 5, [[4, 4]]);
  const outcome = reveal(board, 0, 0);
  assert.equal(outcome.result, 'revealed');
  assert.equal(outcome.cells.length, 24); // everything except the mine
  assert.equal(board.discoveredCount, 24);
  assert.equal(isWon(board), true);
});

test('win is detected after several separate empty areas (old double-count bug)', () => {
  // A wall of mines in column 2 splits the board into two empty areas.
  const board = boardWithMines(5, 5, [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]);
  reveal(board, 0, 0);
  assert.equal(isWon(board), false);
  reveal(board, 4, 4);
  assert.equal(board.discoveredCount, 20);
  assert.equal(isWon(board), true);
});

test('hitting a mine ends the game and ignores further clicks', () => {
  const board = boardWithMines(3, 3, [[1, 1]]);
  assert.equal(reveal(board, 1, 1).result, 'mine');
  assert.equal(board.over, true);
  assert.equal(reveal(board, 0, 0).result, 'ignored');
});

test('out-of-range and repeated clicks are ignored', () => {
  const board = boardWithMines(3, 3, [[2, 2]]);
  assert.equal(reveal(board, -1, 0).result, 'ignored');
  assert.equal(reveal(board, 0, 9).result, 'ignored');
  assert.equal(reveal(board, NaN, 0).result, 'ignored');
  reveal(board, 0, 0);
  assert.equal(reveal(board, 0, 0).result, 'ignored');
});

test('only the player who placed a flag can remove it', () => {
  const board = boardWithMines(3, 3, [[2, 2]]);
  assert.equal(toggleFlag(board, 2, 2, 'alice'), true);
  assert.equal(toggleFlag(board, 2, 2, 'bob'), false);
  assert.equal(toggleFlag(board, 2, 2, 'alice'), true);
  assert.equal(board.cells[2][2].flaggedBy, null);
});
