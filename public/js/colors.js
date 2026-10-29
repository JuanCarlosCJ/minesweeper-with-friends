// Player colours: the server uses short codes, the page uses hex values.
// The codes are also the CSS class prefixes (LBflag, Gplayer, ...).

const CODES = {
  LB: '#0000ff', // light blue
  G: '#008000', // green
  R: '#ff0000', // red
  DB: '#000080', // dark blue
};

export function decodeColor(code) {
  return CODES[code] ?? null;
}

export function encodeColor(hex) {
  return Object.keys(CODES).find((code) => CODES[code] === hex) ?? null;
}
