// The four things that hunt the player, and how each one moves. An enemy is a
// plain object the world owns; this file only knows how to make one and how it
// behaves for a step. Spitters ask the world to fire through the `api` they are
// handed, and splitters ask it to birth their children the same way.

import { ENEMIES, WAVE_HP_GROWTH, WAVE_SPEED_CAP, WAVE_SPEED_GROWTH } from './config.js';

export const KIND_CINDER = 'cinder';
export const KIND_SPARKLING = 'sparkling';
export const KIND_SPITTER = 'spitter';
export const KIND_SPLITTER = 'splitter';

/** Which kinds a wave may deal, by wave number. */
export function kindsForWave(wave) {
  const kinds = [KIND_CINDER];
  if (wave >= 2) kinds.push(KIND_SPITTER);
  if (wave >= 3) kinds.push(KIND_SPLITTER);
  return kinds;
}

/** Weighted pick of a kind for this wave: cinders stay common, splitters rare. */
export function pickKind(rng, wave) {
  const kinds = kindsForWave(wave);
  const weights = kinds.map((kind) => (kind === KIND_CINDER ? 5 : kind === KIND_SPITTER ? 3 : 2));
  let roll = rng.next() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < kinds.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return kinds[i];
  }
  return KIND_CINDER;
}

export function createEnemy(kind, x, y, wave) {
  const base = ENEMIES[kind];
  const hpScale = 1 + (wave - 1) * WAVE_HP_GROWTH;
  const speedScale = Math.min(WAVE_SPEED_CAP, 1 + (wave - 1) * WAVE_SPEED_GROWTH);
  return {
    kind,
    x,
    y,
    radius: base.radius,
    hp: Math.round(base.hp * hpScale),
    maxHp: Math.round(base.hp * hpScale),
    speed: base.speed * speedScale,
    damage: base.damage,
    score: base.score,
    /** Seconds left of the spawn-in shimmer; no collision while > 0. */
    spawnIn: 0.45,
    /** Seconds until a spitter fires again. */
    fireTimer: 1.2 + Math.random() * 0.8,
    /** Wobble phase so chasers do not march in lockstep. */
    wobble: Math.random() * Math.PI * 2,
    angle: 0,
  };
}

/**
 * Move one enemy for a step. `api` is the world: { fireEnemyBullet(x, y, angle),
 * split(enemy) } — enemies never touch the world's arrays themselves.
 */
export function updateEnemy(enemy, player, dt, api) {
  if (enemy.spawnIn > 0) enemy.spawnIn -= dt;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const nx = dx / distance;
  const ny = dy / distance;
  enemy.angle = Math.atan2(dy, dx);
  enemy.wobble += dt * 3;

  if (enemy.kind === KIND_SPITTER) {
    // Keep a ring around the player and shoot at them.
    const want = 260;
    const toward = distance > want + 30 ? 1 : distance < want - 30 ? -1 : 0;
    const strafe = Math.sin(enemy.wobble) * 0.5;
    enemy.x += (nx * toward + -ny * strafe) * enemy.speed * dt;
    enemy.y += (ny * toward + nx * strafe) * enemy.speed * dt;
    enemy.fireTimer -= dt;
    if (enemy.fireTimer <= 0 && distance < 520) {
      enemy.fireTimer = 2.1;
      api.fireEnemyBullet(enemy.x, enemy.y, enemy.angle);
    }
  } else {
    // Chasers, sparklings and splitters close in, with a small sideways wobble.
    const wobble = enemy.kind === KIND_SPARKLING ? 0.55 : 0.25;
    enemy.x += (nx + -ny * Math.sin(enemy.wobble) * wobble) * enemy.speed * dt;
    enemy.y += (ny + nx * Math.sin(enemy.wobble) * wobble) * enemy.speed * dt;
  }
}
