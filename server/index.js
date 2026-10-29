// Minesweeper With Friends: web server + WebSocket game server.
// One HTTP server serves the page (public/) and the WebSocket on the same
// address, so it works the same locally and behind a hosting proxy.

const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');

const config = require('./config');
const { ClientAction, ServerAction } = require('./protocol');
const { Players } = require('./players');
const { Lobbies, toInt } = require('./game/lobbies');

const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });

const players = new Players();
const lobbies = new Lobbies(players);

const handlers = {
  [ClientAction.CREATE_LOBBY]: (player) => lobbies.create(player),
  [ClientAction.FIND_LOBBIES]: (player) => players.send(player.id, ServerAction.LOBBY_LIST, JSON.stringify(lobbies.list())),
  [ClientAction.UPDATE_LOBBIES]: (player) => players.send(player.id, ServerAction.LOBBY_LIST_UPDATE, JSON.stringify(lobbies.list())),
  [ClientAction.JOIN_LOBBY]: (player, msg) => lobbies.join(player, msg.content),
  [ClientAction.LEAVE_LOBBY]: (player) => lobbies.leave(player),
  [ClientAction.CHANGE_DIFFICULTY]: (player, msg) => lobbies.changeDifficulty(player, msg.content, msg.boardInfo),
  [ClientAction.START_GAME]: (player) => lobbies.start(player),
  [ClientAction.MOUSE_POSITION]: (player, msg) => lobbies.cursor(player, msg.content),
  [ClientAction.FLAG_CELL]: (player, msg) => lobbies.flag(player, toInt(msg.content?.cellX), toInt(msg.content?.cellY)),
  [ClientAction.DISCOVER_CELL]: (player, msg) => lobbies.discover(player, toInt(msg.content?.cellX), toInt(msg.content?.cellY)),
  [ClientAction.CHORD_CELLS]: (player, msg) => lobbies.chord(player, msg.content),
};

wss.on('connection', (ws) => {
  const player = players.add(ws);
  ws.isAlive = true;
  console.log(`${player.username} connected (${players.size} online)`);

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return; // ignore anything that isn't JSON
    }
    try {
      handlers[msg?.action]?.(player, msg);
    } catch (error) {
      console.error(`Error handling "${msg?.action}" from ${player.username}:`, error);
    }
  });

  ws.on('close', () => {
    lobbies.leave(player);
    players.remove(player);
    console.log(`${player.username} disconnected (${players.size} online)`);
  });
});

// Drop connections that stopped answering (closed laptop, lost Wi-Fi...).
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, config.heartbeatMs);
wss.on('close', () => clearInterval(heartbeat));

server.listen(config.port, () => {
  console.log(`Minesweeper With Friends running on http://localhost:${config.port}`);
});
