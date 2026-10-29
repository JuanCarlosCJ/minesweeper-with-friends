// English / Spanish texts.
// Static texts in index.html carry data-i18n="key"; code uses t('key').
// The language is picked from the browser on the first visit and remembered.

const texts = {
  en: {
    createLobby: 'Create Lobby',
    findLobby: 'Find Lobby',
    backToMenu: 'Back to Menu',
    username: 'Username:',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    custom: 'Custom',
    width: 'Width',
    height: 'Height',
    mines: 'Mines',
    confirm: 'Confirm',
    play: 'Play!',
    waiting: 'Waiting for player',
    flags: 'Flags:',
    flagMode: 'Flag mode',
    noLobbies: 'No open lobbies yet. Create one and invite your friends!',
    connectionLost: 'Connection lost. Reload the page to play again.',
    hostLeft: 'The host closed the lobby.',
    joinFailed: 'Could not join that lobby.',
    lobbyGone: 'That lobby no longer exists.',
    lobbyFull: 'That lobby is full.',
    lobbyPlaying: 'That lobby is already playing.',
  },
  es: {
    createLobby: 'Crear Sala',
    findLobby: 'Buscar Sala',
    backToMenu: 'Volver al Menú',
    username: 'Nombre:',
    easy: 'Fácil',
    medium: 'Medio',
    hard: 'Difícil',
    custom: 'Personalizado',
    width: 'Ancho',
    height: 'Alto',
    mines: 'Minas',
    confirm: 'Confirmar',
    play: '¡Jugar!',
    waiting: 'Esperando jugador',
    flags: 'Banderas:',
    flagMode: 'Modo bandera',
    noLobbies: 'Todavía no hay salas abiertas. ¡Crea una e invita a tus amigos!',
    connectionLost: 'Se perdió la conexión. Recarga la página para volver a jugar.',
    hostLeft: 'El anfitrión cerró la sala.',
    joinFailed: 'No se pudo entrar en esa sala.',
    lobbyGone: 'Esa sala ya no existe.',
    lobbyFull: 'Esa sala está llena.',
    lobbyPlaying: 'Esa sala ya está jugando.',
  },
};

const STORAGE_KEY = 'msf-language';
let language = 'en';

export function t(key) {
  return texts[language][key] ?? texts.en[key] ?? key;
}

export function currentLanguage() {
  return language;
}

export function setLanguage(lang) {
  if (!texts[lang]) return;
  language = lang;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('.languageSwitch [data-lang]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
  });
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // private mode: the choice just isn't remembered
  }
}

// Saved choice first, otherwise Spanish for Spanish browsers, otherwise English.
export function initLanguage() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    saved = null;
  }
  const browserSpanish = (navigator.languages || [navigator.language]).some((l) => /^es\b/i.test(l || ''));
  setLanguage(saved || (browserSpanish ? 'es' : 'en'));

  document.querySelector('.languageSwitch').addEventListener('click', (e) => {
    const lang = e.target.closest('[data-lang]')?.dataset.lang;
    if (lang) setLanguage(lang);
  });
}
