// The game board: drawing cells, counters, flags and cursors, sizing the board
// to the screen, and handling mouse and touch input.

import { state } from './state.js';
import { send } from './socket.js';
import { encodeColor } from './colors.js';
import { showScreen, cellAt, toast } from './ui.js';
import { t } from './i18n.js';

const NEIGHBOURS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [-1, -1], [1, -1], [-1, 1],
];

const LONG_PRESS_MS = 420; // hold this long on a touch screen to place a flag
const TOUCH_SLOP_PX = 10; // moving further than this is a scroll, not a tap

const cellsEl = () => document.querySelector('.bottomArea');
const smileyEl = () => document.querySelector('.smileyFace');
const isTouchScreen = () => window.matchMedia('(pointer: coarse)').matches;

let timerInterval = null;
let chordingInterval = null;
let cursorInterval = null;
let firstBoard = true;
let playing = false;

// Pointer tracking (for the pressed look and for sharing my cursor)
let pointerX = 0;
let pointerY = 0;
let mouseIsDown = false;
let lastCellVisited = null;
let lastCursorSent = null;

// Touch state
let touch = null; // { cell, x, y, timer, longPressed }
let lastTouchTime = 0;
let flagMode = false;

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
  document.querySelector('.flagModeIcon').className = `flagModeIcon ${myColor}flag`;
  setFlagMode(false);

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
  container.style.gridTemplateColumns = `repeat(${width}, var(--cell))`;
  container.style.gridTemplateRows = `repeat(${height}, var(--cell))`;

  // Smiley: short "pressed" look when restarting
  const smiley = smileyEl();
  smiley.className = 'smileyFace';
  if (!firstBoard) {
    smiley.classList.add('facePressed');
    setTimeout(() => smiley.classList.remove('facePressed'), 250);
  }
  firstBoard = false;

  showScreen('.boardArea');
  fitBoard();
  showTouchHint();

  playing = true;
  timerInterval = setInterval(() => {
    state.timer++;
    updateTimer();
  }, 1000);
  chordingInterval = setInterval(showPressed, 20);
  cursorInterval = setInterval(sendCursor, 50);
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
  playing = false;
  clearInterval(timerInterval);
  clearInterval(chordingInterval);
  clearInterval(cursorInterval);
  cancelTouch();
}

// ---------- fitting the board to the screen ----------

let zoom = 1;

// Picks a cell size so the whole board fits the screen. On touch screens cells
// never get smaller than a comfortable tap size; the board scrolls instead.
// The zoom buttons scale the result.
export function fitBoard() {
  if (!state.width || document.querySelector('.boardArea').classList.contains('displayNone')) return;

  // Space used around the cells: board padding, frames and the counters bar.
  const px = (el, ...props) => props.reduce((sum, p) => sum + parseFloat(getComputedStyle(el)[p]), 0);
  const board = document.querySelector('.board');
  const wrapper = document.querySelector('.bottomAreaWrapper');
  const grid = cellsEl();
  const aroundX = px(board, 'paddingLeft', 'paddingRight') + px(wrapper, 'paddingLeft', 'paddingRight') + px(grid, 'paddingLeft', 'paddingRight');
  const aroundY = px(board, 'paddingTop', 'paddingBottom') + px(wrapper, 'paddingTop', 'paddingBottom')
    + px(grid, 'paddingTop', 'paddingBottom') + document.querySelector('.topAreaWrapper').offsetHeight;

  const area = document.querySelector('.boardArea');
  const fit = Math.floor(Math.min((area.clientWidth - aroundX) / state.width, (area.clientHeight - aroundY) / state.height));
  const min = isTouchScreen() ? 24 : 18;
  const size = Math.round(Math.max(min, Math.min(44, fit)) * zoom);
  document.documentElement.style.setProperty('--cell', `${size}px`);
}

export function changeZoom(direction) {
  zoom = Math.max(0.5, Math.min(2.5, zoom * (direction > 0 ? 1.15 : 1 / 1.15)));
  fitBoard();
}

window.addEventListener('resize', fitBoard);

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
    cell.classList.remove('pressed');
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

// Other players' cursors arrive as % of the grid of cells, so they point at
// the same cell whatever the screen size.
export function moveCursor({ player, x, y }) {
  const cursor = document.querySelector(`.multiplayerCursors [data-playerid="${player}"]`);
  if (!cursor) return;
  if (x < 0) {
    cursor.style.display = 'none';
    return;
  }
  const grid = cellsEl().getBoundingClientRect();
  const layer = document.querySelector('.multiplayerCursors').getBoundingClientRect();
  cursor.style.display = 'block';
  cursor.style.left = `${grid.left - layer.left + (x / 100) * grid.width}px`;
  cursor.style.top = `${grid.top - layer.top + (y / 100) * grid.height}px`;
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

// ---------- actions (shared by mouse and touch) ----------

const isNumber = (cell) => /\btype\d\b/.test(cell.className);
const coords = (cell) => ({ cellX: cell.dataset.coordX, cellY: cell.dataset.coordY });

function neighboursOf(cell) {
  const x = Number(cell.dataset.coordX);
  const y = Number(cell.dataset.coordY);
  return NEIGHBOURS
    .map(([dx, dy]) => [x + dx, y + dy])
    .filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < state.width && ny < state.height);
}

function reveal(cell) {
  if (cell.classList.contains('closed') && !cell.classList.contains('flagged')) send('CD', coords(cell));
}

// Chording: on an open number whose flags are all placed, open the rest around it.
function chord(cell) {
  const type = Number(cell.className.match(/\btype(\d)\b/)[1]);
  let flags = 0;
  const closed = [];
  for (const [x, y] of neighboursOf(cell)) {
    const neighbour = cellAt(x, y);
    if (neighbour.classList.contains('flagged')) flags++;
    else if (neighbour.classList.contains('closed')) closed.push([x, y]);
  }
  if (type > 0 && type === flags && closed.length) send('CCD', closed);
}

function toggleFlag(cell) {
  if (!cell.classList.contains('closed')) return;
  // Can't remove someone else's flag
  const mine = cell.classList.contains(`${encodeColor(state.color)}flag`);
  if (cell.classList.contains('flagged') && !mine) return;
  send('CFG', coords(cell));
}

// ---------- mouse ----------

// Browsers fire fake mouse events after a touch; ignore those.
const fromRecentTouch = () => Date.now() - lastTouchTime < 800;

function onMouseUp(e) {
  if (!playing || fromRecentTouch() || e.button !== 0) return;
  const cell = e.target.closest('.cell');
  if (!cell) return;
  if (isNumber(cell)) chord(cell);
  else reveal(cell);
}

function onContextMenu(e) {
  e.preventDefault();
  if (!playing || fromRecentTouch()) return; // a long-press already placed the flag
  const cell = e.target.closest('.cell');
  if (cell) toggleFlag(cell);
}

// While the mouse is held down, show which cells would open (classic "pressed" look).
function showPressed() {
  if (!mouseIsDown) return;
  const cell = document.elementFromPoint(pointerX, pointerY)?.closest('.cell');

  if (cell !== lastCellVisited) clearPressed();
  lastCellVisited = cell;
  if (!cell || cell.classList.contains('flagged')) return;

  if (isNumber(cell)) {
    for (const [x, y] of neighboursOf(cell)) {
      const neighbour = cellAt(x, y);
      if (neighbour.classList.contains('closed') && !neighbour.classList.contains('flagged')) {
        neighbour.classList.add('pressed');
      }
    }
  } else if (cell.classList.contains('closed')) {
    cell.classList.add('pressed');
  }
}

function clearPressed() {
  document.querySelectorAll('.cell.pressed').forEach((c) => c.classList.remove('pressed'));
}

// ---------- touch ----------
// Tap: reveal (or chord on a number). Long-press: flag. Flag mode: taps flag.
// Dragging scrolls the board as usual.

function onTouchStart(e) {
  lastTouchTime = Date.now();
  if (!playing || e.touches.length !== 1) {
    cancelTouch(); // two fingers = pinch zoom / scroll
    return;
  }
  const cell = e.target.closest('.cell');
  if (!cell) return;

  const { clientX, clientY } = e.touches[0];
  pointerX = clientX;
  pointerY = clientY;
  if (cell.classList.contains('closed') && !cell.classList.contains('flagged')) cell.classList.add('pressed');

  touch = {
    cell,
    x: clientX,
    y: clientY,
    longPressed: false,
    timer: setTimeout(() => {
      if (!touch) return;
      touch.longPressed = true;
      cell.classList.remove('pressed');
      toggleFlag(cell);
      navigator.vibrate?.(25);
    }, LONG_PRESS_MS),
  };
}

function onTouchMove(e) {
  if (!touch) return;
  const { clientX, clientY } = e.touches[0];
  if (Math.hypot(clientX - touch.x, clientY - touch.y) > TOUCH_SLOP_PX) cancelTouch();
}

function onTouchEnd(e) {
  lastTouchTime = Date.now();
  if (!touch) return;
  const { cell, longPressed } = touch;
  cancelTouch();
  e.preventDefault(); // stop the browser's fake mouse click
  if (longPressed) return;

  if (flagMode) toggleFlag(cell);
  else if (isNumber(cell)) chord(cell);
  else reveal(cell);
}

function cancelTouch() {
  if (!touch) return;
  clearTimeout(touch.timer);
  touch.cell.classList.remove('pressed');
  touch = null;
}

// Explain the touch controls the first time someone plays on a touch screen.
function showTouchHint() {
  if (!isTouchScreen()) return;
  try {
    if (localStorage.getItem('msf-touch-hint')) return;
    localStorage.setItem('msf-touch-hint', '1');
  } catch {
    // private mode: show it every time
  }
  toast(t('touchHint'));
}

export function setFlagMode(on) {
  flagMode = on;
  const button = document.querySelector('.flagModeButton');
  button.setAttribute('aria-pressed', String(on));
}

export function toggleFlagMode() {
  setFlagMode(!flagMode);
}

// ---------- sharing my cursor ----------

// Sent as % of the grid of cells, -1 when outside it.
function sendCursor() {
  const grid = cellsEl().getBoundingClientRect();
  const inside = pointerX >= grid.left && pointerX <= grid.right && pointerY >= grid.top && pointerY <= grid.bottom;
  const position = inside
    ? {
      x: Number((((pointerX - grid.left) / grid.width) * 100).toFixed(1)),
      y: Number((((pointerY - grid.top) / grid.height) * 100).toFixed(1)),
    }
    : { x: -1, y: -1 };

  const key = `${position.x},${position.y}`;
  if (key === lastCursorSent) return;
  lastCursorSent = key;
  send('MPU', position);
}

export function leaveBoard() {
  stopGameLoops();
}

// ---------- listeners ----------

const container = cellsEl();
container.addEventListener('mouseup', onMouseUp);
container.addEventListener('contextmenu', onContextMenu);
container.addEventListener('touchstart', onTouchStart, { passive: true });
container.addEventListener('touchmove', onTouchMove, { passive: true });
container.addEventListener('touchend', onTouchEnd);
container.addEventListener('touchcancel', cancelTouch);

document.addEventListener('mousemove', (e) => {
  if (fromRecentTouch()) return;
  pointerX = e.clientX;
  pointerY = e.clientY;
});

document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && !fromRecentTouch()) mouseIsDown = true;
});

document.addEventListener('mouseup', () => {
  mouseIsDown = false;
  lastCellVisited = null;
  clearPressed();
}, true);
