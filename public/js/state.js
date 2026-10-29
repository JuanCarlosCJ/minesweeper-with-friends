// Shared state for the current player and game.

export const state = {
  // Who I am (sent by the server on connect)
  playerId: null,
  username: null,
  color: null, // hex, e.g. '#ff0000'

  // Lobby
  isHost: false,
  lobbyPlayers: [],

  // Current board
  width: 0,
  height: 0,
  minesLeft: 0,
  timer: 0,
};
