# Minesweeper With Friends

I love Minesweeper, but it's always been a solo game. So I made a version you can play together: up to four people on the same board, in real time, straight from the browser. You create a lobby, your friends join, and you clear the board as a team while seeing each other's cursors and flags move around.

**You can play it here:** [ms.juancarloscj.com](https://ms.juancarloscj.com)

![A co-op game in progress](docs/game.png)

## What it does

Everyone who joins gets a random name (things like "Sneaky Minefield") and their own colour. When someone reveals a cell or places a flag, it shows up for everyone instantly. Flags keep their owner's colour and only the person who placed one can remove it, and there's a little scoreboard counting each player's flags.

There are four difficulties: Easy (15×15, 40 mines), Medium (29×20, 135), Hard (29×29, 200), and Custom if you want something bigger, up to 100×100.

It works on phones and tablets too. The board sizes itself to your screen, and there are proper touch controls. The interface is in English and Spanish; it picks the language from your browser and you can switch whenever you want.

One thing I cared about: the board only exists on the server. Your browser only ever receives the cells that have been revealed, so nobody can open the dev tools and peek at where the mines are.

| Main menu | Lobby | Game over |
|---|---|---|
| ![Main menu](docs/menu.png) | ![Lobby](docs/lobby.png) | ![Game over](docs/game-over.png) |

## Controls

| | Mouse | Touch screen |
|---|---|---|
| Reveal a cell | Left-click | Tap |
| Place / remove your flag | Right-click | Long-press (or turn on **Flag mode** and tap) |
| Open everything around a number (*chord*) | Click the number once its flags are placed | Tap the number once its flags are placed |
| Restart | Click the smiley | Tap the smiley |
| Zoom, back to menu | Hover the panel in the top-right corner | Tap the panel in the top-right corner |
| Scoreboard | Hover the panel on the left | Tap the panel on the left |

On small screens big boards scroll, but the counters and the smiley stay in view.

| Phone: menu | Phone: lobby | Phone: game |
|---|---|---|
| ![Phone menu](docs/mobile.png) | ![Phone lobby](docs/mobile-lobby.png) | ![Phone game](docs/mobile-game.png) |

## How I built it

The backend is a small Node.js server (Express + [`ws`](https://github.com/websockets/ws)) and the frontend is plain JavaScript split into ES modules. No framework and no build step; I wanted to keep it simple.

```
Browser (public/)                               Node.js server (server/)
─────────────────                               ────────────────────────
main.js    wires messages and buttons    ◄──►   index.js     Express + WebSocket on one port
socket.js  WebSocket client                 WS   players.js   connected players, names, colours
board.js   cells, sizing, mouse + touch input    game/lobbies.js  lobbies and game flow
lobby.js   lobby and lobby browser               game/board.js    mines, flood fill, win check
i18n.js    English / Spanish texts                protocol.js  message codes
```

A few decisions worth mentioning:

- The page and the WebSocket are served from the same server and port. The client just connects back to whatever host it was loaded from, so the exact same code runs on my laptop and behind a proxy in production.
- The messages are tiny JSON objects like `{ "action": "CD", "content": { "cellX": 3, "cellY": 7 } }`. I kept the action codes short because cursor positions are sent many times per second. They're all listed and explained in [`server/protocol.js`](server/protocol.js).
- The server doesn't trust anything the client sends. It checks coordinates, custom board sizes, who owns a flag and who's allowed to start a game.
- A ping/pong heartbeat drops connections that went quiet (closed laptop, lost Wi-Fi…), so ghost players don't stay in lobbies.

## Running it locally

You'll need [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone https://github.com/JuanCarlosCJ/minesweeper-with-friends.git
cd minesweeper-with-friends
npm install
npm start
```

Then open http://localhost:3000. To try multiplayer on your own, open a second browser window: create a lobby in one and join it from the other.

| Command | What it does |
|---|---|
| `npm start` | Starts the server (port `3000`, or `PORT` if set) |
| `npm run dev` | Same, but restarts when server files change |
| `npm test` | Runs the tests for the board rules |
| `npm run art` | Regenerates all the graphics in `public/img/` (needs Python 3) |

## Project structure

```
server/            Node.js game server
  index.js         entry point: web server, WebSocket, message routing
  config.js        difficulties, limits, colours, port
  protocol.js      message codes (client ↔ server)
  players.js       connected players
  names.js         random player names
  game/board.js    board rules
  game/lobbies.js  lobbies and game flow
public/            the browser client (no build step)
  index.html
  css/style.css
  js/              ES modules
  img/             generated SVG graphics
  fonts/           Pixelify Sans (SIL Open Font License)
test/              tests (Node's built-in test runner)
tools/             graphics generator
docs/              screenshots
```

## How I deploy it

It's just a Node.js app listening on `PORT`, so it runs anywhere Node does. On my server I keep it alive with a process manager and put a web server in front of it for HTTPS:

1. Upload the project and install the dependencies with `npm ci --omit=dev`.
2. Run it with [pm2](https://pm2.keymetrics.io/), which restarts it if it crashes and brings it back after a reboot:

   ```bash
   PORT=3101 pm2 start server/index.js --name minesweeper
   pm2 save
   pm2 startup
   ```

3. Put a reverse proxy in front that also forwards WebSocket upgrades. With nginx it looks like this:

   ```nginx
   location / {
       proxy_pass http://127.0.0.1:3101;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
   }
   ```

The proxy takes care of HTTPS and certificate renewals, so the game itself never has to deal with certificates.

## Artwork

All the graphics are drawn from code by [`tools/generate-art.py`](tools/generate-art.py): the tiles, numbers, mines, flags, cursors, counter digits and my little hard-hat smiley. The colours and pixel maps are at the top of that file, so if you want to tweak something, change it there and run `npm run art`.

![All game graphics](docs/artwork.png)

The font is [Pixelify Sans](https://github.com/eifetx/Pixelify-Sans), used under the SIL Open Font License ([`public/fonts/OFL.txt`](public/fonts/OFL.txt)).

## License

[MIT](LICENSE) © Juan Carlos
