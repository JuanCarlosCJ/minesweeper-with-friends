// Connected players and sending messages to them.

const { randomUUID } = require('crypto');
const { WebSocket } = require('ws');
const config = require('./config');
const { ServerAction } = require('./protocol');
const { randomName } = require('./names');

class Players {
  constructor() {
    this.players = new Map();
    this.colorCodes = Object.keys(config.colors);
    this.nextColor = 0;
  }

  add(ws) {
    const player = {
      id: `client-${randomUUID()}`,
      ws,
      username: randomName(),
      // New players get the colours in turn, so friends joining one by one
      // usually don't clash.
      color: this.colorCodes[this.nextColor++ % this.colorCodes.length],
      lobbyId: null,
    };
    this.players.set(player.id, player);
    this.sendIdentity(player);
    return player;
  }

  remove(player) {
    this.players.delete(player.id);
  }

  get(id) {
    return this.players.get(id);
  }

  get size() {
    return this.players.size;
  }

  send(id, action, content) {
    const player = this.players.get(id);
    if (!player || player.ws.readyState !== WebSocket.OPEN) return;
    const message = content === undefined ? { action } : { action, content };
    player.ws.send(JSON.stringify(message));
  }

  sendIdentity(player) {
    this.send(player.id, ServerAction.IDENTITY, {
      color: player.color,
      username: player.username,
      playerId: player.id,
    });
  }
}

module.exports = { Players };
