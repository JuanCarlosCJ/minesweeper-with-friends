// Small UI helpers shared by the other modules.

// Shows one screen (.mainMenu, .lobby, .lobbyBrowser, .boardArea) and hides the rest.
export function showScreen(selector) {
  document.querySelectorAll('.gameAreas > div').forEach((screen) => {
    screen.classList.toggle('displayNone', !screen.matches(selector));
  });
}

export function cellAt(x, y) {
  return document.querySelector(`.cell[data-coord-x="${x}"][data-coord-y="${y}"]`);
}

// Short message at the bottom of the screen.
let toastTimeout = null;
export function toast(text, { sticky = false } = {}) {
  let box = document.querySelector('.toast');
  if (!box) {
    box = document.createElement('div');
    box.className = 'toast';
    document.body.appendChild(box);
  }
  box.textContent = text;
  box.classList.add('visible');
  clearTimeout(toastTimeout);
  if (!sticky) toastTimeout = setTimeout(() => box.classList.remove('visible'), 3500);
}
