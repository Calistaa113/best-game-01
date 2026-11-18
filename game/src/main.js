// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between six screens: title, play, paused,
// upgrade, game over and win.
//
// ?seed=N fixes the arena's pattern. ?shot=start|play|upgrade|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_OVER, EVENT_WAVE_CLEAR, EVENT_WIN } from './world.js';
import { ACTION_CHOICE_1, ACTION_CHOICE_2, ACTION_CHOICE_3, ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { rollUpgrades } from './upgrades.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_WIN, upgradeCardRects } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, { best: scene.best, upgrades: scene.upgrades, banner: null });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let upgrades = [];
  let banner = null;
  let accumulator = 0;
  let last = performance.now();

  world.seedAmbient();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    world.startWave(1);
    banner = { text: 'WAVE 1', sub: 'The cinders are coming', timer: 2 };
    screen = SCREEN_PLAY;
    announce('Playing. Wave 1. Good luck, little spark.');
  }

  function nextWave() {
    const wave = world.state.wave + 1;
    world.startWave(wave);
    banner = { text: `WAVE ${wave}`, sub: wave === 10 ? 'The final wave' : '', timer: 2 };
    screen = SCREEN_PLAY;
    announce(`Wave ${wave}.`);
  }

  function showUpgrades() {
    upgrades = rollUpgrades(world.rng, world.state.owned, 3);
    screen = SCREEN_UPGRADE;
    audio.waveClear();
    announce(`Wave ${world.state.wave} cleared. Choose an upgrade.`);
  }

  function pickUpgrade(index) {
    const upgrade = upgrades[index];
    if (!upgrade) return;
    upgrade.apply(world.state.player);
    world.state.owned[upgrade.id] = (world.state.owned[upgrade.id] || 0) + 1;
    audio.upgrade();
    announce(`Picked ${upgrade.name}.`);
    nextWave();
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    audio.gameOver();
    announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function winGame() {
    screen = SCREEN_WIN;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    audio.win();
    announce(`Arena Champion! Score ${world.state.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions) audio.unlock();
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startGame();
    else if (actions & ACTION_CONFIRM && screen === SCREEN_OVER) startGame();
    else if (actions & ACTION_CONFIRM && screen === SCREEN_WIN) {
      // The champion keeps going: endless waves past wave 10.
      world.state.endless = true;
      nextWave();
      announce('Endless mode. How far can the spark go?');
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (screen === SCREEN_UPGRADE) {
      if (actions & ACTION_CHOICE_1) pickUpgrade(0);
      else if (actions & ACTION_CHOICE_2) pickUpgrade(1);
      else if (actions & ACTION_CHOICE_3) pickUpgrade(2);
      else if (actions & ACTION_CONFIRM) {
        // A click on a card picks it; a click elsewhere does nothing.
        const aim = input.aim();
        const rects = upgradeCardRects();
        for (let i = 0; i < rects.length; i += 1) {
          const rect = rects[i];
          if (aim.x >= rect.x && aim.x <= rect.x + rect.width && aim.y >= rect.y && aim.y <= rect.y + rect.height) {
            pickUpgrade(i);
            break;
          }
        }
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { mx: 0, my: 0, ax: 0, ay: 0, fire: false }, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const before = { bullets: world.state.bullets.length, kills: world.state.kills };
    const move = input.move();
    const aim = input.aim();
    const events = world.step(STEP, { mx: move.x, my: move.y, ax: aim.x, ay: aim.y, fire: input.firing() }, false);
    if (world.state.bullets.length > before.bullets) audio.shoot();
    if (world.state.kills > before.kills) audio.explode();
    if (banner && banner.timer > 0) banner.timer -= STEP;
    if (events & EVENT_HIT) {
      audio.hurt();
      announce(world.state.player.hp <= 25 ? 'Hit. Low health!' : 'Hit.');
    }
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_WIN) winGame();
    else if (events & EVENT_WAVE_CLEAR) showUpgrades();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      step();
      accumulator -= STEP;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(world.state, screen, { best, upgrades, banner });
  }

  // Leaving the tab pauses a running game rather than letting cinders close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberfall. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
