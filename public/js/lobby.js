// Lobby screens: my lobby (host or guest) and the lobby browser.

import { state } from './state.js';
import { send } from './socket.js';
import { decodeColor } from './colors.js';
import { showScreen, toast } from './ui.js';
import { t } from './i18n.js';
import { leaveBoard } from './board.js';

const MAX_SIZE = 100;
const MAX_MINE_RATIO = 0.8;

let browserInterval = null;
let waitingInterval = null;
let lastLobbyList = null;

// ---------- my lobby ----------

// I created a lobby (I'm the host).
export function openOwnLobby() {
  state.isHost = true;
  document.querySelector('.difficulties').classList.remove('notHost');
  document.querySelector('.playButton').classList.remove('displayNone');
  renderLobby({
    players: [{ playerUsername: state.username, playerColor: null, playerId: state.playerId, isHost: true }],
    difficulty: 'easy',
  });
  showScreen('.lobby');
}

// I joined someone else's lobby.
export function openJoinedLobby(lobby) {
  state.isHost = false;
  stopBrowser();
  document.querySelector('.difficulties').classList.add('notHost');
  document.querySelector('.playButton').classList.add('displayNone');
  renderLobby(lobby);
  showScreen('.lobby');
}

export function updateLobby(lobby) {
  document.querySelector('.customDifficulty').classList.add('displayNone');
  renderLobby(lobby);
}

function renderLobby(lobby) {
  state.lobbyPlayers = lobby.players;

  const me = document.querySelector('.lobbyPlayerDetails p span');
  me.textContent = state.username;
  me.style.color = state.color;

  document.querySelectorAll('.lobbyPlayers > div').forEach((card, i) => {
    const player = lobby.players[i];
    const name = card.querySelector('p');
    card.classList.toggle('noPlayer', !player);
    if (player) {
      const color = player.playerId === state.playerId ? state.color : decodeColor(player.playerColor);
      name.textContent = player.playerUsername;
      name.style.color = color;
      card.style.backgroundColor = `${color}B3`;
    } else {
      name.style.color = '';
      card.style.backgroundColor = '';
    }
  });

  document.querySelectorAll('.difficulties > p').forEach((option) => {
    option.classList.toggle('chosenDifficulty', option.dataset.difficulty === lobby.difficulty);
  });

  startWaitingDots();
}

// Animated "Waiting for player..." on empty seats.
function startWaitingDots() {
  if (waitingInterval) return;
  let dots = 0;
  const tick = () => {
    document.querySelectorAll('.noPlayer p').forEach((p) => {
      p.textContent = `${t('waiting')}${'.'.repeat(dots)}`;
    });
    dots = (dots + 1) % 4;
  };
  tick();
  waitingInterval = setInterval(tick, 450);
}

function stopWaitingDots() {
  clearInterval(waitingInterval);
  waitingInterval = null;
}

// Clicks on difficulties, custom settings and Play (host only).
export function onLobbyDetailsClick(e) {
  if (!state.isHost) return;
  const target = e.target;

  const difficulty = target.closest('.difficulties > p')?.dataset.difficulty;
  if (difficulty) {
    if (target.classList.contains('chosenDifficulty') && difficulty !== 'custom') return;
    if (difficulty === 'custom') {
      document.querySelector('.customDifficulty').classList.remove('displayNone');
      document.querySelector('.customMineX input').focus();
      return;
    }
    send('DCH', difficulty);
    return;
  }

  if (target.closest('.playButton')) {
    send('STG');
    return;
  }

  if (target.closest('.customConfirmation')) {
    const widthInput = document.querySelector('.customMineX input');
    const heightInput = document.querySelector('.customMineY input');
    const minesInput = document.querySelector('.customMineCount input');

    const clamp = (input, min, max) => {
      const value = Math.max(min, Math.min(max, Math.round(Number(input.value) || min)));
      input.value = value;
      return value;
    };
    const width = clamp(widthInput, 5, MAX_SIZE);
    const height = clamp(heightInput, 5, MAX_SIZE);
    const mineCount = clamp(minesInput, 1, Math.floor(width * height * MAX_MINE_RATIO));

    send('DCH', 'custom', { boardInfo: { width, height, mineCount } });
  }
}

// ---------- lobby browser ----------

export function openBrowser() {
  const me = document.querySelector('.lobbyBrowserPlayerDetails p span');
  me.textContent = state.username;
  me.style.color = state.color;

  lastLobbyList = null;
  send('UL');
  stopBrowser();
  browserInterval = setInterval(() => send('UL'), 2500);
  showScreen('.lobbyBrowser');
}

function stopBrowser() {
  clearInterval(browserInterval);
  browserInterval = null;
}

export function updateBrowser(lobbies) {
  const key = JSON.stringify(lobbies);
  if (key === lastLobbyList) return;
  lastLobbyList = key;

  const list = document.querySelector('.availableLobbies');
  list.replaceChildren();
  for (const lobby of lobbies) {
    if (lobby.playing) continue;
    const host = lobby.players[0];
    const color = decodeColor(host.playerColor);

    const row = document.createElement('div');
    row.className = 'availableLobby';
    row.dataset.host = host.playerId;

    const name = document.createElement('p');
    name.className = 'lobbyHostName';
    name.textContent = host.playerUsername;
    name.style.color = color;

    const count = document.createElement('p');
    count.className = 'lobbyPlayerCount';
    count.textContent = `${lobby.playerCount}/4`;
    count.style.color = color;

    row.append(name, count);
    list.appendChild(row);
  }
}

export function joinFailed(reason) {
  toast(String(reason || 'Could not join that lobby.').replace(/^Error:\s*/, ''));
}

// ---------- leaving ----------

export function backToMenu() {
  stopBrowser();
  stopWaitingDots();
  leaveBoard();
  if (state.lobbyPlayers.length) send('LL');
  state.lobbyPlayers = [];
  state.isHost = false;
  showScreen('.mainMenu');
}

// The host closed the lobby.
export function lobbyDisbanded() {
  stopWaitingDots();
  leaveBoard();
  state.lobbyPlayers = [];
  state.isHost = false;
  showScreen('.mainMenu');
  toast('The host closed the lobby.');
}
