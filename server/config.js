// Game settings shared by the server modules.

module.exports = {
  // Port for local development. In production (Plesk / Passenger) the
  // hosting environment sets PORT or takes over listen() automatically.
  port: Number(process.env.PORT) || 3000,

  maxPlayersPerLobby: 4,

  // Player colours, sent to clients as short codes.
  // The client maps them to its CSS classes (LBflag, Gplayer, ...).
  colors: {
    LB: '#0000ff', // light blue
    G: '#008000', // green
    R: '#ff0000', // red
    DB: '#000080', // dark blue
  },

  difficulties: {
    easy: { width: 15, height: 15, mines: 40 },
    medium: { width: 29, height: 20, mines: 135 },
    hard: { width: 29, height: 29, mines: 200 },
  },

  // Limits for custom boards, checked on the server so a client can't
  // ask for a board that would freeze it.
  customLimits: {
    minSize: 5,
    maxSize: 100,
    minMines: 1,
    maxMineRatio: 0.8, // at most 80% of the cells can be mines
  },

  // Dead connections are dropped if they don't answer a ping in time.
  heartbeatMs: 30000,
};
