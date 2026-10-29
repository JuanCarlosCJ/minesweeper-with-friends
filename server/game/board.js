// Board creation and the rules for revealing cells.
// A board lives on the server only; clients just get the cells they reveal.

const NEIGHBOURS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

// Picks `amount` different numbers between 0 and max - 1.
function uniqueRandoms(amount, max) {
  const picked = new Set();
  while (picked.size < amount) {
    picked.add(Math.floor(Math.random() * max));
  }
  return [...picked];
}

function createBoard(width, height, mineCount) {
  const cells = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push({ x, y, isMine: false, type: 0, discovered: false, flaggedBy: null });
    }
    cells.push(row);
  }

  const mines = [];
  for (const index of uniqueRandoms(mineCount, width * height)) {
    const cell = cells[Math.floor(index / width)][index % width];
    cell.isMine = true;
    mines.push(cell);
  }

  // A cell's type is the number of mines around it.
  for (const mine of mines) {
    forEachNeighbour({ width, height }, mine.x, mine.y, (nx, ny) => {
      cells[ny][nx].type++;
    });
  }

  return {
    width,
    height,
    mineCount,
    cells,
    mines,
    discoveredCount: 0,
    over: false, // true once the game is won or lost
  };
}

function forEachNeighbour(board, x, y, fn) {
  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < board.width && ny < board.height) fn(nx, ny);
  }
}

function getCell(board, x, y) {
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return board.cells[y]?.[x] ?? null;
}

// Reveals one cell. Returns what happened, for the caller to broadcast:
//   { result: 'ignored' }
//   { result: 'mine', cell }
//   { result: 'revealed', cells: [...] }  (several cells when an empty area opens up)
function reveal(board, x, y) {
  const cell = getCell(board, x, y);
  if (!cell || cell.discovered || board.over) return { result: 'ignored' };

  if (cell.isMine) {
    cell.discovered = true;
    board.over = true;
    return { result: 'mine', cell };
  }

  // Flood fill: opening a 0 also opens its neighbours, and so on.
  // Each cell is counted once, when it's first marked discovered.
  const revealed = [];
  const queue = [cell];
  cell.discovered = true;

  while (queue.length) {
    const current = queue.shift();
    board.discoveredCount++;
    revealed.push({ type: current.type, x: current.x, y: current.y });

    if (current.type !== 0) continue;
    forEachNeighbour(board, current.x, current.y, (nx, ny) => {
      const next = board.cells[ny][nx];
      if (!next.discovered && !next.isMine) {
        next.discovered = true;
        queue.push(next);
      }
    });
  }

  return { result: 'revealed', cells: revealed };
}

function isWon(board) {
  return board.discoveredCount === board.width * board.height - board.mineCount;
}

// Flags belong to the player who placed them; only they can remove them.
// Returns true if the flag changed.
function toggleFlag(board, x, y, playerId) {
  const cell = getCell(board, x, y);
  if (!cell || cell.discovered || board.over) return false;
  if (cell.flaggedBy && cell.flaggedBy !== playerId) return false;
  cell.flaggedBy = cell.flaggedBy ? null : playerId;
  return true;
}

module.exports = { createBoard, reveal, isWon, toggleFlag, getCell };
