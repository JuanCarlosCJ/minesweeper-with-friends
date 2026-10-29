// English / Spanish texts. The language button is hidden for now
// (see .languageChanger in index.html), but switching already works.

const texts = [
  { selector: '[data-action="CL"]', en: 'Create Lobby', es: 'Crear Sala' },
  { selector: '[data-action="FL"]', en: 'Find Lobby', es: 'Buscar Sala' },
  { selector: '[data-difficulty="easy"]', en: 'Easy', es: 'Fácil' },
  { selector: '[data-difficulty="medium"]', en: 'Medium', es: 'Medio' },
  { selector: '[data-difficulty="hard"]', en: 'Hard', es: 'Difícil' },
  { selector: '[data-difficulty="custom"]', en: 'Custom', es: 'Personalizado' },
  { selector: '.backToMenu, .boardBackToMenu p', en: 'Back to Menu', es: 'Volver al Menú' },
  { selector: '.playButton p', en: 'Play!', es: '¡Jugar!' },
  { selector: '.customConfirmation p', en: 'Confirm', es: 'Confirmar' },
  { selector: '.customMineX p', en: 'Width', es: 'Ancho' },
  { selector: '.customMineY p', en: 'Height', es: 'Alto' },
  { selector: '.customMineCount p', en: 'Mines', es: 'Minas' },
];

const phrases = {
  waiting: { en: 'Waiting for player', es: 'Esperando jugador' },
  flags: { en: 'Flags:', es: 'Banderas:' },
};

let language = 'en';

export function t(key) {
  return phrases[key]?.[language] ?? key;
}

export function setLanguage(lang) {
  language = lang;
  for (const item of texts) {
    document.querySelectorAll(item.selector).forEach((el) => {
      el.textContent = item[lang];
    });
  }
}

export function toggleLanguage() {
  setLanguage(language === 'es' ? 'en' : 'es');
}
