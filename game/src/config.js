// The arena and every number that tunes Emberfall: sizes, speeds, health and the
// wave curve. Nothing here knows about the canvas or the loop; change a number,
// change the game.

/** Logical size of the arena, in game units. The canvas letterboxes to it. */
export const FIELD = { width: 960, height: 600 };
/** Fixed simulation step, in seconds. */
export const STEP = 1 / 60;
/** The wave whose clear screen is a win; after it the arena runs endless. */
export const WIN_WAVE = 10;
/** Local-storage key for the best score. */
export const BEST_KEY = 'emberfall-best-score';

export const PLAYER = {
  radius: 14,
  speed: 260,
  maxHp: 100,
  fireInterval: 0.34,
  bulletSpeed: 620,
  bulletDamage: 34,
  bulletRadius: 5,
  projectiles: 1,
  pierce: 0,
  /** Seconds of mercy after a hit before the next hit can land. */
  hurtCooldown: 0.8,
  /** Radius inside which score embers drift toward the player. */
  emberRadius: 90,
};

export const ENEMIES = {
  cinder: { radius: 15, hp: 40, speed: 95, damage: 12, score: 10, color: '#ff7a3c' },
  sparkling: { radius: 9, hp: 16, speed: 175, damage: 8, score: 10, color: '#ffd166' },
  spitter: { radius: 16, hp: 55, speed: 70, damage: 10, score: 25, color: '#c77dff' },
  splitter: { radius: 22, hp: 90, speed: 55, damage: 15, score: 30, color: '#4cc9f0' },
};

/** Enemy health and speed grow this much per wave, on top of wave 1. */
export const WAVE_HP_GROWTH = 0.09;
export const WAVE_SPEED_GROWTH = 0.02;
export const WAVE_SPEED_CAP = 1.35;
/** Enemies in wave n, before the mix below. */
export const WAVE_COUNT = (n) => 5 + 2 * n;
/** Seconds between spawn ticks inside a wave. */
export const SPAWN_INTERVAL = 0.55;

export const PALETTE = {
  background: '#0d0b1e',
  arena: '#14122b',
  grid: '#1e1b3d',
  wall: '#2a2560',
  player: '#ffb703',
  playerCore: '#fff3d6',
  bullet: '#ffe066',
  enemyBullet: '#e07a5f',
  text: '#f4f1ff',
  dim: '#9b94c7',
  hp: '#ff5d8f',
  hpBack: '#3a2b4d',
  gold: '#ffd166',
  danger: '#ff4d6d',
};
