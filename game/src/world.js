// The simulation: the player, the bullets, the enemies, the embers and the
// waves, advanced one fixed step at a time. The world knows nothing about the
// keyboard, the canvas or the screens — a step takes an input ({mx, my, ax, ay,
// fire}) and returns an event bitmask the loop turns into screens and sounds.

import { FIELD, PLAYER, SPAWN_INTERVAL, WAVE_COUNT, WIN_WAVE } from './config.js';
import { createEnemy, kindsForWave, pickKind, KIND_SPLITTER, KIND_SPARKLING, updateEnemy } from './enemies.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WAVE_CLEAR = 4;
export const EVENT_WIN = 8;

const ENEMY_BULLET_SPEED = 240;

function spawnPoint(rng, player) {
  // An arena edge, at least 200 units from the player so nothing spawns on top.
  for (let tries = 0; tries < 12; tries += 1) {
    const edge = rng.int(0, 3);
    const x = edge === 0 ? 30 : edge === 1 ? FIELD.width - 30 : rng.range(40, FIELD.width - 40);
    const y = edge === 2 ? 30 : edge === 3 ? FIELD.height - 30 : rng.range(40, FIELD.height - 40);
    if (Math.hypot(x - player.x, y - player.y) > 200) return { x, y };
  }
  return { x: 30, y: 30 };
}

export function createWorld(rng) {
  const state = {};
  let eventFlags = EVENT_NONE;

  function reset() {
    Object.assign(state, {
      player: {
        x: FIELD.width / 2,
        y: FIELD.height / 2,
        radius: PLAYER.radius,
        hp: PLAYER.maxHp,
        maxHp: PLAYER.maxHp,
        speed: PLAYER.speed,
        fireInterval: PLAYER.fireInterval,
        bulletSpeed: PLAYER.bulletSpeed,
        bulletDamage: PLAYER.bulletDamage,
        bulletRadius: PLAYER.bulletRadius,
        projectiles: PLAYER.projectiles,
        pierce: PLAYER.pierce,
        emberRadius: PLAYER.emberRadius,
        fireTimer: 0,
        hurtTimer: 0,
        angle: -Math.PI / 2,
      },
      bullets: [],
      enemyBullets: [],
      enemies: [],
      particles: [],
      texts: [],
      embers: [],
      wave: 0,
      score: 0,
      kills: 0,
      spawnQueue: 0,
      spawnTimer: 0,
      waveActive: false,
      endless: false,
      shake: 0,
      time: 0,
      owned: {},
    });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = rng.range(0, Math.PI * 2);
      const velocity = rng.range(speed * 0.3, speed);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: rng.range(0.25, 0.6),
        maxLife: 0.6,
        size: rng.range(2, 4.5),
        color,
      });
    }
  }

  function floatText(x, y, text, color) {
    state.texts.push({ x, y, vy: -34, life: 0.9, text, color });
  }

  function dropEmbers(x, y, count) {
    for (let i = 0; i < count; i += 1) {
      state.embers.push({
        x: x + rng.range(-8, 8),
        y: y + rng.range(-8, 8),
        vx: rng.range(-40, 40),
        vy: rng.range(-40, 40),
        value: 5,
        life: 9,
      });
    }
  }

  function startWave(wave) {
    state.wave = wave;
    state.spawnQueue = WAVE_COUNT(wave);
    state.spawnTimer = 0.4;
    state.waveActive = true;
  }

  function killEnemy(enemy, index) {
    state.enemies.splice(index, 1);
    state.score += enemy.score;
    state.kills += 1;
    burst(enemy.x, enemy.y, enemy.kind === KIND_SPLITTER ? '#4cc9f0' : '#ff7a3c', enemy.kind === KIND_SPLITTER ? 22 : 12, 180);
    dropEmbers(enemy.x, enemy.y, enemy.kind === KIND_SPLITTER ? 3 : 1);
    floatText(enemy.x, enemy.y - 10, `+${enemy.score}`, '#ffd166');
    if (enemy.kind === KIND_SPLITTER) {
      for (let i = 0; i < 2; i += 1) {
        const child = createEnemy(KIND_SPARKLING, enemy.x + rng.range(-14, 14), enemy.y + rng.range(-14, 14), state.wave);
        child.spawnIn = 0.2;
        state.enemies.push(child);
      }
    }
  }

  function hurtPlayer(damage, fromX, fromY) {
    const player = state.player;
    if (player.hurtTimer > 0 || player.hp <= 0) return;
    player.hp -= damage;
    player.hurtTimer = PLAYER.hurtCooldown;
    state.shake = 9;
    const dx = player.x - fromX;
    const dy = player.y - fromY;
    const distance = Math.hypot(dx, dy) || 1;
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + (dx / distance) * 18));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + (dy / distance) * 18));
    burst(player.x, player.y, '#ff5d8f', 10, 160);
    eventFlags |= EVENT_HIT;
    if (player.hp <= 0) {
      player.hp = 0;
      burst(player.x, player.y, '#ffb703', 40, 260);
      eventFlags |= EVENT_OVER;
    }
  }

  function step(dt, input, ambient) {
    eventFlags = EVENT_NONE;
    state.time += dt;
    const player = state.player;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (player.hurtTimer > 0) player.hurtTimer -= dt;

    if (ambient) {
      // Title-screen drift: a few cinders wander the arena, nothing fights.
      for (const enemy of state.enemies) {
        enemy.wobble += dt;
        enemy.x += Math.cos(enemy.wobble) * 26 * dt;
        enemy.y += Math.sin(enemy.wobble * 0.7) * 26 * dt;
        enemy.x = Math.min(FIELD.width - 20, Math.max(20, enemy.x));
        enemy.y = Math.min(FIELD.height - 20, Math.max(20, enemy.y));
      }
      updateParticles(dt);
      return EVENT_NONE;
    }

    // --- Player movement and aim ---
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + input.mx * player.speed * dt));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + input.my * player.speed * dt));
    player.angle = Math.atan2(input.ay - player.y, input.ax - player.x);

    // --- Firing ---
    player.fireTimer -= dt;
    if (input.fire && player.fireTimer <= 0 && player.hp > 0) {
      player.fireTimer = player.fireInterval;
      const spread = 0.09;
      for (let i = 0; i < player.projectiles; i += 1) {
        const offset = (i - (player.projectiles - 1) / 2) * spread;
        const angle = player.angle + offset;
        state.bullets.push({
          x: player.x + Math.cos(angle) * (player.radius + 6),
          y: player.y + Math.sin(angle) * (player.radius + 6),
          vx: Math.cos(angle) * player.bulletSpeed,
          vy: Math.sin(angle) * player.bulletSpeed,
          damage: player.bulletDamage,
          pierce: player.pierce,
          hit: new Set(),
          dead: false,
        });
      }
    }

    // --- Spawning ---
    if (state.waveActive && state.spawnQueue > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = SPAWN_INTERVAL;
        state.spawnQueue -= 1;
        const point = spawnPoint(rng, player);
        state.enemies.push(createEnemy(pickKind(rng, state.wave), point.x, point.y, state.wave));
      }
    }

    // --- Enemies ---
    const api = {
      fireEnemyBullet(x, y, angle) {
        state.enemyBullets.push({
          x, y,
          vx: Math.cos(angle) * ENEMY_BULLET_SPEED,
          vy: Math.sin(angle) * ENEMY_BULLET_SPEED,
          damage: 10,
          dead: false,
        });
      },
    };
    for (const enemy of state.enemies) updateEnemy(enemy, player, dt, api);

    // --- Bullets ---
    for (const bullet of state.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) bullet.dead = true;
    }
    for (const bullet of state.enemyBullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) bullet.dead = true;
    }

    // --- Bullet vs enemy ---
    for (const bullet of state.bullets) {
      if (bullet.dead) continue;
      for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = state.enemies[i];
        if (enemy.spawnIn > 0 || bullet.hit.has(enemy)) continue;
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        if (dx * dx + dy * dy < (5 + enemy.radius) * (5 + enemy.radius)) {
          enemy.hp -= bullet.damage;
          bullet.hit.add(enemy);
          burst(bullet.x, bullet.y, '#ffe066', 4, 120);
          if (enemy.hp <= 0) killEnemy(enemy, i);
          if (bullet.pierce > 0) bullet.pierce -= 1;
          else {
            bullet.dead = true;
            break;
          }
        }
      }
    }
    state.bullets = state.bullets.filter((b) => !b.dead);

    // --- Enemy contact ---
    if (player.hp > 0) {
      for (const enemy of state.enemies) {
        if (enemy.spawnIn > 0) continue;
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const reach = player.radius + enemy.radius - 2;
        if (dx * dx + dy * dy < reach * reach) hurtPlayer(enemy.damage, enemy.x, enemy.y);
        if (player.hp <= 0) break;
      }
    }

    // --- Enemy bullets vs player ---
    if (player.hp > 0) {
      for (const bullet of state.enemyBullets) {
        if (bullet.dead) continue;
        const dx = player.x - bullet.x;
        const dy = player.y - bullet.y;
        const reach = player.radius + 6;
        if (dx * dx + dy * dy < reach * reach) {
          bullet.dead = true;
          hurtPlayer(bullet.damage, bullet.x, bullet.y);
        }
      }
    }
    state.enemyBullets = state.enemyBullets.filter((b) => !b.dead);

    // --- Embers drift to the player and are collected ---
    for (const ember of state.embers) {
      ember.life -= dt;
      const dx = player.x - ember.x;
      const dy = player.y - ember.y;
      const distance = Math.hypot(dx, dy) || 1;
      if (distance < player.emberRadius) {
        ember.vx += (dx / distance) * 900 * dt;
        ember.vy += (dy / distance) * 900 * dt;
      } else {
        ember.vx *= 1 - 2 * dt;
        ember.vy *= 1 - 2 * dt;
      }
      ember.x += ember.vx * dt;
      ember.y += ember.vy * dt;
      if (distance < player.radius + 10) {
        ember.life = 0;
        state.score += ember.value;
      }
    }
    state.embers = state.embers.filter((e) => e.life > 0);

    updateParticles(dt);

    // --- Wave cleared? ---
    if (state.waveActive && state.spawnQueue === 0 && state.enemies.length === 0 && player.hp > 0) {
      state.waveActive = false;
      const bonus = 50 * state.wave;
      state.score += bonus;
      floatText(player.x, player.y - 30, `WAVE BONUS +${bonus}`, '#7bf1a8');
      if (state.wave === WIN_WAVE && !state.endless) eventFlags |= EVENT_WIN;
      else eventFlags |= EVENT_WAVE_CLEAR;
    }

    return eventFlags;
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 1 - 2.4 * dt;
      particle.vy *= 1 - 2.4 * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const text of state.texts) {
      text.y += text.vy * dt;
      text.life -= dt;
    }
    state.texts = state.texts.filter((t) => t.life > 0);
  }

  function seedAmbient() {
    reset();
    const kinds = kindsForWave(1);
    for (let i = 0; i < 6; i += 1) {
      const enemy = createEnemy(kinds[i % kinds.length], rng.range(80, FIELD.width - 80), rng.range(80, FIELD.height - 80), 1);
      enemy.spawnIn = 0;
      state.enemies.push(enemy);
    }
  }

  reset();
  return { state, rng, reset, step, startWave, seedAmbient, burst, floatText };
}
