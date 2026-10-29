// The game board: drawing cells, counters, flags, cursors and handling clicks.

import { state } from './state.js';
import { send } from './socket.js';
import { encodeColor } from './colors.js';
import { showScreen, cellAt } from './ui.js';
import { t } from './i18n.js';

const NEIGHBOURS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, -1], [1, -1], [-1, 1],
];

const boardEl = () => document.querySelector('.board');
const cellsEl = () => document.querySelector('.bottomArea');
const smileyEl = () => document.querySelector('.smileyFace');

let timerInterval = null;
let chordingInterval = null;
let cursorInterval = null;
let firstBoard = true;

// Mouse tracking (for chording and for sharing my cursor)
let mouseX = 0;
let mouseY = 0;
let mouseIsDown = false;
let lastCellVisited = null;
let lastNeighboursVisited = null;
let lastCursorSent = null;

// ---------- starting a game ----------

export function createBoard(width, height, mineCount, lobbyPlayers) {
  state.width = width;
  state.height = height;
  state.minesLeft = mineCount;
  state.timer = 0;
  state.lobbyPlayers = lobbyPlayers;

  stopGameLoops();

  const myColor = encodeColor(state.color);
  document.querySelector('.mineCounter').className = `mineCounter ${myColor}hueRotate`;
  document.querySelector('.timer').className = `timer ${myColor}hueRotate`;

  renderScoreboard(lobbyPlayers);
  renderCursors(lobbyPlayers);
  updateMineCounter();
  updateTimer();

  // Cells
  const container = cellsEl();
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < width * height; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell closed';
    cell.dataset.coordX = i % width;
    cell.dataset.coordY = Math.floor(i / width);
    cell.draggable = false;
    fragment.appendChild(cell);
  }
  container.replaceChildren(fragment);
  container.style.gridTemplateColumns = `repeat(${width}, minmax(0, 1fr))`;
  container.style.gridTemplateRows = `repeat(${height}, minmax(0, 1fr))`;

  // Smiley: short "pressed" look when restarting
  const smiley = smileyEl();
  smiley.className = 'smileyFace';
  if (!firstBoard) {
    smiley.classList.add('facePressed');
    setTimeout(() => smiley.classList.remove('facePressed'), 250);
  }
  firstBoard = false;

  showScreen('.boardArea');

  timerInterval = setInterval(() => {
    state.timer++;
    updateTimer();
  }, 1000);
  chordingInterval = setInterval(chording, 20);
  cursorInterval = setInterval(sendCursor, 50);
  container.addEventListener('contextmenu', onRightClick);
  container.addEventListener('mouseup', onCellClick);
}

function renderScoreboard(players) {
  const list = document.querySelector('.boardPlayers');
  list.replaceChildren();
  for (const player of players) {
    const row = document.createElement('div');
    row.classList.add(`${player.playerColor}playerScore`);

    const name = document.createElement('p');
    name.textContent = player.playerUsername;

    const score = document.createElement('p');
    score.dataset.flags = 0;
    const label = document.createElement('span');
    label.dataset.i18n = 'flags';
    label.textContent = t('flags');
    score.append(label, ' ');
    const count = document.createElement('span');
    count.className = 'flagCount';
    count.textContent = '0';
    score.appendChild(count);

    row.append(name, score);
    list.appendChild(row);
  }
}

function renderCursors(players) {
  const container = document.querySelector('.multiplayerCursors');
  container.replaceChildren();
  for (const player of players) {
    if (player.playerId === state.playerId) continue;
    const cursor = document.createElement('div');
    cursor.classList.add(`${player.playerColor}player`);
    cursor.dataset.playerid = player.playerId;
    cursor.style.display = 'none';
    container.appendChild(cursor);
  }
}

function stopGameLoops() {
  clearInterval(timerInterval);
  clearInterval(chordingInterval);
  clearInterval(cursorInterval);
  const container = cellsEl();
  container.removeEventListener('contextmenu', onRightClick);
  container.removeEventListener('mouseup', onCellClick);
}

// ---------- updates from the server ----------

export function revealCells(details) {
  const cells = Array.isArray(details) ? details : [details];
  for (const { x, y, type } of cells) {
    const cell = cellAt(x, y);
    if (!cell) continue;
    cell.classList.remove('closed', 'pressed');
    cell.classList.add(`type${type}`);
  }
}

export function flagCell({ color, x, y }) {
  const code = encodeColor(color);
  const cell = cellAt(x, y);
  if (!cell) return;

  const removing = cell.classList.contains('flagged');
  if (removing) {
    cell.className = 'cell closed';
    state.minesLeft++;
  } else {
    cell.classList.add('flagged', `${code}flag`);
    state.minesLeft--;
  }
  updateMineCounter();

  const score = document.querySelector(`.${code}playerScore [data-flags]`);
  if (score) {
    const flags = Number(score.dataset.flags) + (removing ? -1 : 1);
    score.dataset.flags = flags;
    score.querySelector('.flagCount').textContent = flags;
  }
}

export function moveCursor({ player, x, y }) {
  const cursor = document.querySelector(`.multiplayerCursors [data-playerid="${player}"]`);
  if (!cursor) return;
  if (x < 0) {
    cursor.style.display = 'none';
    return;
  }
  cursor.style.display = 'block';
  cursor.style.left = `${x}%`;
  cursor.style.top = `${y}%`;
}

export function lostGame(details) {
  stopGameLoops();
  if (details) {
    for (const mine of details.allMines) cellAt(mine.x, mine.y)?.classList.add('mine');
    cellAt(details.x, details.y)?.classList.add('redMine');
  }
  smileyEl().classList.add('lostGame');
}

export function wonGame() {
  stopGameLoops();
  const code = encodeColor(state.color);
  document.querySelectorAll('.cell.closed:not(.flagged)').forEach((cell) => {
    cell.classList.add('flagged', `${code}flag`);
  });
  state.minesLeft = 0;
  updateMineCounter();
  smileyEl().classList.add('wonGame');
}

// ---------- counters ----------

function setDials(prefix, value) {
  const n = Math.max(0, Math.min(999, value));
  const digits = [Math.floor(n / 100), Math.floor((n % 100) / 10), n % 10];
  digits.forEach((digit, i) => {
    document.querySelector(`.${prefix}${i}`).className = `${prefix}${i} d${digit}`;
  });
}

function updateMineCounter() {
  setDials('mineCounter', state.minesLeft);
}

function updateTimer() {
  if (state.timer > 999) clearInterval(timerInterval);
  setDials('timer', state.timer);
}

// ---------- my clicks ----------

function onCellClick(e) {
  const cell = e.target;
  if (e.button === 2 || !cell.classList.contains('cell') || cell.classList.contains('flagged')) return;

  // Chording: clicking an open number whose flags are all placed opens the rest.
  if (/\btype\d\b/.test(cell.className) && lastNeighboursVisited) {
    const type = Number(cell.className.match(/\btype(\d)\b/)[1]);
    let flags = 0;
    const closed = [];
    for (const [x, y] of lastNeighboursVisited) {
      const neighbour = cellAt(x, y);
      if (neighbour.classList.contains('flagged')) flags++;
      else if (neighbour.classList.contains('closed')) closed.push([x, y]);
    }
    if (type === flags && closed.length) send('CCD', closed);
    lastNeighboursVisited = null;
    return;
  }

  if (!cell.classList.contains('closed')) return;
  send('CD', { cellX: cell.dataset.coordX, cellY: cell.dataset.coordY });
}

function onRightClick(e) {
  e.preventDefault();
  const cell = e.target.closest('.cell');
  if (!cell || !cell.classList.contains('closed')) return;
  // Can't remove someone else's flag
  const mine = cell.classList.contains(`${encodeColor(state.color)}flag`);
  if (cell.classList.contains('flagged') && !mine) return;
  send('CFG', { cellX: cell.dataset.coordX, cellY: cell.dataset.coordY });
}

// While the mouse is held down, show which cells would open (classic "pressed" look).
function chording() {
  if (!mouseIsDown) return;
  const cell = document.elementFromPoint(mouseX, mouseY)?.closest('.cell');

  if (cell !== lastCellVisited) clearPressed();
  lastCellVisited = cell;
  if (!cell || cell.classList.contains('flagged')) return;

  if (/\btype\d\b/.test(cell.className)) {
    const x = Number(cell.dataset.coordX);
    const y = Number(cell.dataset.coordY);
    lastNeighboursVisited = NEIGHBOURS
      .map(([dx, dy]) => [x + dx, y + dy])
      .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < state.width && ny < state.height);
    for (const [nx, ny] of lastNeighboursVisited) {
      const neighbour = cellAt(nx, ny);
      if (neighbour.classList.contains('closed') && !neighbour.classList.contains('flagged')) {
        neighbour.classList.add('pressed');
      }
    }
  } else {
    lastNeighboursVisited = null;
    if (cell.classList.contains('closed')) cell.classList.add('pressed');
  }
}

function clearPressed() {
  document.querySelectorAll('.cell.pressed').forEach((c) => c.classList.remove('pressed'));
}

// Share my cursor position with the lobby, as % of the board.
function sendCursor() {
  const rect = boardEl().getBoundingClientRect();
  const inside = mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom;
  const position = inside
    ? { x: Number((((mouseX - rect.left) / rect.width) * 100).toFixed(1)), y: Number((((mouseY - rect.top) / rect.height) * 100).toFixed(1)) }
    : { x: -1, y: -1 };

  const key = `${position.x},${position.y}`;
  if (key === lastCursorSent) return;
  lastCursorSent = key;
  send('MPU', position);
}

// ---------- zoom ----------

let zoom = 60;
export function changeZoom(step) {
  zoom = Math.max(30, Math.min(200, zoom + step));
  boardEl().style.width = `${zoom}%`;
}

export function leaveBoard() {
  stopGameLoops();
}

// ---------- global mouse listeners ----------

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

document.addEventListener('mousedown', (e) => {
  if (e.button !== 2) mouseIsDown = true;
});

document.addEventListener('mouseup', () => {
  mouseIsDown = false;
  lastCellVisited = null;
  clearPressed();
}, true);
