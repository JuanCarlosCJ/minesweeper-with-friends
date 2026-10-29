// Message codes used over the WebSocket. Every message is JSON:
//   { action: '<code>', content?: ... }
// Short codes keep the frequent messages (cursor positions) small.

// Client -> server
const ClientAction = {
  CREATE_LOBBY: 'CL',
  FIND_LOBBIES: 'FL', // open the lobby browser
  UPDATE_LOBBIES: 'UL', // refresh the lobby browser
  JOIN_LOBBY: 'JL', // content: host player id
  LEAVE_LOBBY: 'LL',
  CHANGE_DIFFICULTY: 'DCH', // content: 'easy' | 'medium' | 'hard' | 'custom' (+ boardInfo)
  START_GAME: 'STG',
  MOUSE_POSITION: 'MPU', // content: { x, y } in % of the board, -1 when outside
  FLAG_CELL: 'CFG', // content: { cellX, cellY }
  DISCOVER_CELL: 'CD', // content: { cellX, cellY }
  CHORD_CELLS: 'CCD', // content: [[x, y], ...]
};

// Server -> client
const ServerAction = {
  IDENTITY: 'ID', // your id, name and colour
  LOBBY_CREATED: 'LC',
  LOBBY_LIST: 'LI', // reply to FIND_LOBBIES
  LOBBY_LIST_UPDATE: 'UL', // reply to UPDATE_LOBBIES
  LOBBY_JOINED: 'LJS',
  LOBBY_JOIN_FAILED: 'DE', // content: reason
  LOBBY_UPDATE: 'CLU', // players or difficulty changed
  LOBBY_DISBANDED: 'LDB', // the host left
  GAME_STARTED: 'STGA', // content: { board: { x, y, mineCount }, lobbyPlayers }
  PLAYER_CURSOR: 'LPMU', // content: { player, x, y }
  CELL_FLAGGED: 'FCU', // content: { color, x, y }
  CELL_DISCOVERED: 'DCU', // content: { type, x, y }
  CELLS_DISCOVERED: 'MR', // content: [{ type, x, y }, ...]
  MINE_HIT: 'MD', // content: { x, y, allMines: [{ x, y }, ...] }
  GAME_WON: 'GW',
};

module.exports = { ClientAction, ServerAction };
