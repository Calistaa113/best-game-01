// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the
// real rules forward from a fresh world, steered by an autopilot, so the frame is
// what a short game really looks like and the same seed always gives the same
// frame. The play pilot fights well; the end pilot never fires and walks into
// the swarm, as a careless player would.

import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN } from './render.js';
import { rollUpgrades } from './upgrades.js';

const START_SECONDS = 6;
const LIMIT_SECONDS = 600;

/** Steer the wisp: keep a fighting distance from the nearest enemy, fire at it. */
function fightPilot(state) {
  const player = state.player;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const enemy of state.enemies) {
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = enemy;
    }
  }
  let mx = 0;
  let my = 0;
  // Flee anything close, with a pull toward the centre so the wisp never camps a wall.
  for (const enemy of state.enemies) {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < 150) {
      const weight = (150 - distance) / 150;
      mx += (dx / distance) * weight;
      my += (dy / distance) * weight;
    }
  }
  mx += (FIELD.width / 2 - player.x) / FIELD.width * 0.6;
  my += (FIELD.height / 2 - player.y) / FIELD.height * 0.6;
  if (nearest && nearestDistance > 260) {
    mx += (nearest.x - player.x) / nearestDistance * 0.7;
    my += (nearest.y - player.y) / nearestDistance * 0.7;
  }
  const length = Math.hypot(mx, my) || 1;
  const capped = Math.min(1, length);
  return {
    mx: (mx / length) * capped,
    my: (my / length) * capped,
    ax: nearest ? nearest.x : player.x,
    ay: nearest ? nearest.y : player.y - 100,
    fire: nearest !== null,
  };
}

/** The end pilot: no shots, and a slow walk toward the swarm. */
function doomedPilot(state) {
  const player = state.player;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const enemy of state.enemies) {
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = enemy;
    }
  }
  if (!nearest) return { mx: 0, my: 0, ax: player.x, ay: player.y, fire: false };
  return {
    mx: ((nearest.x - player.x) / nearestDistance) * 0.4,
    my: ((nearest.y - player.y) / nearestDistance) * 0.4,
    ax: nearest.x,
    ay: nearest.y,
    fire: false,
  };
}

/**
 * Set `world` to the named scene and return what to draw over it: the screen,
 * the best score to show, and the upgrade cards for the upgrade scene.
 */
export function stageShot(name, world) {
  if (name !== 'play' && name !== 'upgrade' && name !== 'end') {
    world.seedAmbient();
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { mx: 0, my: 0, ax: 0, ay: 0, fire: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0, upgrades: [] };
  }

  if (name === 'end') {
    // Fight waves 1 and 2 properly, then stop firing on wave 3 and die with a
    // real score behind the game-over screen, as a player who ran out of luck.
    world.reset();
    world.startWave(1);
    let doomed = false;
    for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, doomed ? doomedPilot(world.state) : fightPilot(world.state), false);
      if (events & EVENT_OVER) break;
      if (events & (EVENT_WAVE_CLEAR | EVENT_WIN)) {
        if (world.state.wave >= 2) doomed = true;
        world.startWave(world.state.wave + 1);
      }
    }
    return { screen: SCREEN_OVER, best: world.state.score, upgrades: [] };
  }

  if (name === 'upgrade') {
    world.reset();
    world.startWave(1);
    for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
      const events = world.step(STEP, fightPilot(world.state), false);
      if (events & (EVENT_WAVE_CLEAR | EVENT_WIN)) break;
      if (events & EVENT_OVER) break;
    }
    const upgrades = rollUpgrades(world.rng, world.state.owned, 3);
    return { screen: SCREEN_UPGRADE, best: world.state.score, upgrades };
  }

  world.reset();
  world.startWave(2);
  // Clear wave 2, then catch wave 3 while it is still crowded: seven seconds
  // in, most of its swarm is on the field and the fight is visibly on.
  let wave3Time = -1;
  for (let i = 0; i < LIMIT_SECONDS / STEP; i += 1) {
    const events = world.step(STEP, fightPilot(world.state), false);
    if (events & EVENT_OVER) break;
    if (events & (EVENT_WAVE_CLEAR | EVENT_WIN)) {
      world.startWave(3);
      wave3Time = 0;
    }
    if (wave3Time >= 0) {
      wave3Time += STEP;
      if (wave3Time >= 7) break;
    }
  }
  return { screen: SCREEN_PLAY, best: world.state.score, upgrades: [] };
}
