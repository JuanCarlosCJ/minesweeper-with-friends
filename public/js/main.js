// Entry point: connects server messages and page buttons to the game modules.

import { state } from './state.js';
import { on, send } from './socket.js';
import { decodeColor } from './colors.js';
import { initLanguage } from './i18n.js';
import { createBoard, revealCells, flagCell, moveCursor, lostGame, wonGame, changeZoom, toggleFlagMode } from './board.js';
import {
  openOwnLobby, openJoinedLobby, updateLobby, onLobbyDetailsClick,
  openBrowser, updateBrowser, joinFailed, backToMenu, lobbyDisbanded,
} from './lobby.js';

// ---------- messages from the server ----------

on('ID', ({ content }) => {
  state.username = content.username;
  state.color = decodeColor(content.color);
  state.playerId = content.playerId;
  document.documentElement.style.setProperty('--userColor', state.color);
});

on('LC', () => openOwnLobby());
on('LJS', ({ content }) => openJoinedLobby(JSON.parse(content)));
on('DE', ({ content }) => joinFailed(content));
on('CLU', ({ content }) => updateLobby(JSON.parse(content)));
on('LDB', () => lobbyDisbanded());
on('LI', () => openBrowser());
on('UL', ({ content }) => updateBrowser(JSON.parse(content)));

on('STGA', ({ content }) => createBoard(content.board.x, content.board.y, content.board.mineCount, content.lobbyPlayers));
on('DCU', ({ content }) => revealCells(content));
on('MR', ({ content }) => revealCells(content));
on('FCU', ({ content }) => flagCell(content));
on('LPMU', ({ content }) => moveCursor(content));
on('MD', ({ content }) => lostGame(content));
on('GW', () => wonGame());

// ---------- page buttons ----------

initLanguage();

document.querySelector('.titleCard p').classList.add('intro');

document.querySelector('.mainMenuContents').addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  if (action === 'CL') send('CL');
  if (action === 'FL') send('FL');
});

document.querySelectorAll('.backToMenu').forEach((button) => button.addEventListener('click', backToMenu));

document.querySelector('.lobbyPlayerDetails').addEventListener('click', onLobbyDetailsClick);

document.querySelector('.availableLobbies').addEventListener('click', (e) => {
  const lobby = e.target.closest('.availableLobby');
  if (lobby) send('JL', lobby.dataset.host);
});

// Smiley button restarts the game.
document.querySelector('.smileyFace').addEventListener('click', () => send('STG'));

document.querySelector('.boardMenu').addEventListener('click', (e) => {
  if (e.target.closest('.zoomIn')) changeZoom(1);
  if (e.target.closest('.zoomOut')) changeZoom(-1);
  if (e.target.closest('.boardBackToMenu')) {
    lostGame();
    backToMenu();
  }
});

document.querySelector('.flagModeButton').addEventListener('click', toggleFlagMode);

// Side panels (zoom/menu and scoreboard) open on hover with a mouse.
// On touch screens the first tap opens a panel, and tapping elsewhere closes it.
const panels = document.querySelectorAll('.boardMenu, .boardPlayersWrapper');
const noHover = window.matchMedia('(hover: none)');
panels.forEach((panel) => {
  panel.addEventListener('click', (e) => {
    if (!noHover.matches || panel.classList.contains('open')) return;
    panel.classList.add('open');
    e.stopPropagation(); // the opening tap shouldn't also press a button inside
  }, true);
});
document.addEventListener('click', (e) => {
  panels.forEach((panel) => {
    if (!panel.contains(e.target)) panel.classList.remove('open');
  });
});
