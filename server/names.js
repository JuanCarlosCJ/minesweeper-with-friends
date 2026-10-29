// Random player names like "Sneaky Minefield".

const adjectives = [
  'Explosive', 'Cautious', 'Stealthy', 'Brave', 'Quick', 'Sneaky', 'Hidden',
  'Tense', 'Sharp', 'Hazardous', 'Risky', 'Silent', 'Sudden', 'Dangerous',
  'Swift', 'Steady', 'Alert', 'Tricky', 'Clever', 'Strategic', 'Precise',
  'Dark', 'Fearless', 'Timid', 'Bold', 'Wary', 'Careful', 'Tactical',
  'Subtle', 'Fierce', 'Devious', 'Sharp-eyed', 'Sly', 'Resolute', 'Nimble',
  'Curious', 'Savvy',
];

const nouns = [
  'Mine', 'Bomb', 'Grid', 'Square', 'Cell', 'Tile', 'Danger', 'Flag', 'Risk',
  'Trigger', 'Sweep', 'Explosion', 'Trap', 'Path', 'Strategy', 'Blast',
  'Puzzle', 'Countdown', 'Gridlock', 'Timer', 'Hazard', 'Warning', 'Debris',
  'Trapdoor', 'Depth', 'Pitfall', 'Maze', 'Obstacle', 'Search', 'Enemy',
  'Detection', 'Level', 'Bombsite', 'Cache', 'Fortress', 'Minefield',
  'Pathway', 'Counter', 'Clue', 'Flagging',
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

function randomName() {
  return `${pick(adjectives)} ${pick(nouns)}`;
}

module.exports = { randomName };
