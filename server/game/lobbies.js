// Lobbies and the game played inside them.
// A lobby is identified by its host's player id.

const config = require('../config');
const { ServerAction } = require('../protocol');
const { createBoard, reveal, isWon, toggleFlag } = require('./board');

class Lobbies {
  constructor(players) {
    this.players = players; // the Players registry (see players.js)
    this.lobbies = new Map();
  }

  // ---------- helpers ----------

  get(id) {
    return id ? this.lobbies.get(id) : undefined;
  }

  lobbyOf(player) {
    return this.get(player.lobbyId);
  }

  // What clients see about a lobby (the board stays on the server).
  summary(lobby) {
    return {
      id: lobby.id,
      playerCount: lobby.members.length,
      players: lobby.members.map((id, index) => {
        const p = this.players.get(id);
        return { playerUsername: p.username, playerColor: p.color, playerId: p.id, isHost: index === 0 };
      }),
      playing: lobby.playing,
      difficulty: lobby.difficulty,
    };
  }

  list() {
    return [...this.lobbies.values()].map((lobby) => this.summary(lobby));
  }

  broadcast(lobby, action, content, exceptId) {
    for (const id of lobby.members) {
      if (id !== exceptId) this.players.send(id, action, content);
    }
  }

  broadcastUpdate(lobby) {
    this.broadcast(lobby, ServerAction.LOBBY_UPDATE, JSON.stringify(this.summary(lobby)));
  }

  // ---------- lobby lifecycle ----------

  create(host) {
    if (this.lobbies.has(host.id)) return; // double click
    if (host.lobbyId) this.leave(host);

    const lobby = { id: host.id, members: [host.id], playing: false, difficulty: 'easy', custom: null, board: null };
    this.lobbies.set(host.id, lobby);
    host.lobbyId = host.id;
    this.players.send(host.id, ServerAction.LOBBY_CREATED);
    console.log(`Lobby created by ${host.username}`);
  }

  join(player, hostId) {
    const lobby = this.get(hostId);
    const fail = (reason) => this.players.send(player.id, ServerAction.LOBBY_JOIN_FAILED, reason);

    if (!lobby) return fail('Error: Lobby Disbanded.');
    if (lobby.members.length >= config.maxPlayersPerLobby) return fail('Error: Lobby Already Full.');
    if (lobby.playing) return fail('Error: Lobby Already Playing.');
    if (lobby.members.includes(player.id)) return;
    if (player.lobbyId) this.leave(player);

    // Give the joiner a colour nobody in the lobby has yet.
    const taken = lobby.members.map((id) => this.players.get(id).color);
    if (taken.includes(player.color)) {
      player.color = Object.keys(config.colors).find((c) => !taken.includes(c));
      this.players.sendIdentity(player);
    }

    lobby.members.push(player.id);
    player.lobbyId = lobby.id;
    this.players.send(player.id, ServerAction.LOBBY_JOINED, JSON.stringify(this.summary(lobby)));
    this.broadcastUpdate(lobby);
  }

  leave(player) {
    const lobby = this.lobbyOf(player);
    player.lobbyId = null;
    if (!lobby) return;

    // The host leaving closes the lobby for everyone.
    if (lobby.id === player.id) {
      for (const id of lobby.members) {
        if (id === player.id) continue;
        const member = this.players.get(id);
        if (member) member.lobbyId = null;
        this.players.send(id, ServerAction.LOBBY_DISBANDED);
      }
      this.lobbies.delete(lobby.id);
      console.log(`Lobby of ${player.username} closed`);
      return;
    }

    lobby.members = lobby.members.filter((id) => id !== player.id);
    this.broadcastUpdate(lobby);
  }

  changeDifficulty(player, difficulty, boardInfo) {
    const lobby = this.get(player.id); // only the host's own lobby
    if (!lobby || lobby.playing) return;

    if (difficulty === 'custom') {
      const custom = validateCustomBoard(boardInfo);
      if (!custom) return;
      lobby.custom = custom;
      lobby.difficulty = 'custom';
    } else if (config.difficulties[difficulty]) {
      lobby.difficulty = difficulty;
    } else {
      return;
    }
    this.broadcastUpdate(lobby);
  }

  // ---------- the game ----------

  start(player) {
    const lobby = this.lobbyOf(player);
    if (!lobby) return;
    // The host starts the first game; after that anyone can restart (smiley button).
    if (!lobby.playing && lobby.id !== player.id) return;

    const size = lobby.difficulty === 'custom' ? lobby.custom : config.difficulties[lobby.difficulty];
    lobby.board = createBoard(size.width, size.height, size.mines);
    lobby.playing = true;

    this.broadcast(lobby, ServerAction.GAME_STARTED, {
      board: { x: size.width, y: size.height, mineCount: size.mines },
      lobbyPlayers: this.summary(lobby).players,
    });
  }

  discover(player, x, y) {
    const lobby = this.lobbyOf(player);
    if (!lobby?.board) return;
    const board = lobby.board;
    const outcome = reveal(board, x, y);

    if (outcome.result === 'mine') {
      this.broadcast(lobby, ServerAction.MINE_HIT, {
        x,
        y,
        allMines: board.mines.map((m) => ({ x: m.x, y: m.y })),
      });
      return;
    }

    if (outcome.result === 'revealed') {
      if (outcome.cells.length === 1) {
        this.broadcast(lobby, ServerAction.CELL_DISCOVERED, outcome.cells[0]);
      } else {
        this.broadcast(lobby, ServerAction.CELLS_DISCOVERED, outcome.cells);
      }
      if (isWon(board)) {
        board.over = true;
        this.broadcast(lobby, ServerAction.GAME_WON);
      }
    }
  }

  chord(player, cells) {
    if (!Array.isArray(cells)) return;
    for (const pair of cells.slice(0, 8)) {
      if (!Array.isArray(pair)) continue;
      this.discover(player, toInt(pair[0]), toInt(pair[1]));
      if (this.lobbyOf(player)?.board?.over) return;
    }
  }

  flag(player, x, y) {
    const lobby = this.lobbyOf(player);
    if (!lobby?.board) return;
    if (toggleFlag(lobby.board, x, y, player.id)) {
      this.broadcast(lobby, ServerAction.CELL_FLAGGED, { color: config.colors[player.color], x, y });
    }
  }

  cursor(player, position) {
    const lobby = this.lobbyOf(player);
    if (!lobby || !position) return;
    const x = Number(position.x);
    const y = Number(position.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.broadcast(lobby, ServerAction.PLAYER_CURSOR, { player: player.id, x, y }, player.id);
  }
}

function toInt(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : NaN;
}

function validateCustomBoard(info) {
  if (!info) return null;
  const { minSize, maxSize, minMines, maxMineRatio } = config.customLimits;
  const width = toInt(info.width);
  const height = toInt(info.height);
  const mines = toInt(info.mineCount);
  if ([width, height, mines].some(Number.isNaN)) return null;
  if (width < minSize || height < minSize || width > maxSize || height > maxSize) return null;
  if (mines < minMines || mines > Math.floor(width * height * maxMineRatio)) return null;
  return { width, height, mines };
}

module.exports = { Lobbies, toInt };
