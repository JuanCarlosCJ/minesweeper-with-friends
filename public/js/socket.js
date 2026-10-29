// WebSocket connection to the game server (same host as the page).

import { toast } from './ui.js';

const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
const socket = new WebSocket(`${protocol}://${location.host}`);

const handlers = {};
const queue = []; // messages sent before the connection opened

export function on(action, handler) {
  handlers[action] = handler;
}

export function send(action, content, extra = {}) {
  const message = JSON.stringify({ action, ...(content !== undefined && { content }), ...extra });
  if (socket.readyState === WebSocket.OPEN) socket.send(message);
  else if (socket.readyState === WebSocket.CONNECTING) queue.push(message);
}

socket.addEventListener('open', () => {
  while (queue.length) socket.send(queue.shift());
});

socket.addEventListener('message', (event) => {
  let message;
  try {
    message = JSON.parse(event.data);
  } catch {
    return;
  }
  try {
    handlers[message.action]?.(message);
  } catch (error) {
    console.error(`Error handling "${message.action}":`, error);
  }
});

socket.addEventListener('close', () => {
  toast('Connection lost. Reload the page to play again.', { sticky: true });
});
