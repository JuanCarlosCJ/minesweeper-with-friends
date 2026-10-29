// Entry point: connects server messages and page buttons to the game modules.

import { state } from './state.js';
import { on, send } from './socket.js';
import { decodeColor } from './colors.js';
import { initLanguage } from './i18n.js';
import { createBoard, revealCells, flagCell, moveCursor, lostGame, wonGame, changeZoom } from './board.js';
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
  if (e.target.closest('.zoomIn')) changeZoom(10);
  if (e.target.closest('.zoomOut')) changeZoom(-10);
  if (e.target.closest('.boardBackToMenu')) {
    lostGame();
    backToMenu();
  }
});
