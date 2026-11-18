// Everything the eye sees: the arena, the ember wisp, the four enemy kinds, the
// bullets and sparks, the HUD, and the title, pause, upgrade, win and game-over
// screens. One canvas, one letterboxed view, no images — every shape is drawn.

import { FIELD, PALETTE } from './config.js';
import { KIND_CINDER, KIND_SPARKLING, KIND_SPITTER, KIND_SPLITTER } from './enemies.js';
import { computeView } from './view.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The three upgrade cards' rects in arena units, so clicks can pick a card. */
export function upgradeCardRects() {
  const width = 240;
  const height = 170;
  const gap = 30;
  const total = width * 3 + gap * 2;
  const top = FIELD.height / 2 - 40;
  return [0, 1, 2].map((i) => ({
    x: (FIELD.width - total) / 2 + i * (width + gap),
    y: top,
    width,
    height,
  }));
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    return dpr;
  }

  function panel(x, y, width, height, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 12);
    ctx.fill();
    ctx.stroke();
  }

  function centredText(text, x, y, size, color, weight = 'bold') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  function drawArena(state) {
    ctx.fillStyle = PALETTE.arena;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    for (let x = 60; x < FIELD.width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD.height);
      ctx.stroke();
    }
    for (let y = 60; y < FIELD.height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
    // Arena wall: a soft glowing border.
    ctx.strokeStyle = PALETTE.wall;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, FIELD.width - 6, FIELD.height - 6);
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(9, 9, FIELD.width - 18, FIELD.height - 18);
  }

  function drawPlayer(player, time) {
    const blink = player.hurtTimer > 0 && Math.floor(time * 16) % 2 === 0;
    ctx.save();
    if (blink) ctx.globalAlpha = 0.45;
    // Glow.
    const glow = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 46);
    glow.addColorStop(0, 'rgba(255, 183, 3, 0.5)');
    glow.addColorStop(1, 'rgba(255, 183, 3, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 46, 0, Math.PI * 2);
    ctx.fill();
    // Aim barrel.
    ctx.strokeStyle = PALETTE.player;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.angle) * (player.radius + 12), player.y + Math.sin(player.angle) * (player.radius + 12));
    ctx.stroke();
    // Body, flickering like a flame.
    const flicker = 1 + Math.sin(time * 11) * 0.06;
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * flicker, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.playerCore;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(enemy, time) {
    const spawnScale = enemy.spawnIn > 0 ? 1 - enemy.spawnIn / 0.45 : 1;
    const radius = Math.max(1, enemy.radius * spawnScale);
    ctx.save();
    ctx.globalAlpha = enemy.spawnIn > 0 ? 0.45 + 0.55 * spawnScale : 1;
    if (enemy.kind === KIND_SPARKLING) {
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(time * 3 + enemy.wobble);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(0, -radius);
      ctx.lineTo(radius * 0.8, 0);
      ctx.lineTo(0, radius);
      ctx.lineTo(-radius * 0.8, 0);
      ctx.closePath();
      ctx.fill();
    } else if (enemy.kind === KIND_SPITTER) {
      ctx.fillStyle = '#c77dff';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e0aaff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, radius * 0.55, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#e0aaff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x + Math.cos(enemy.angle) * (radius + 8), enemy.y + Math.sin(enemy.angle) * (radius + 8));
      ctx.stroke();
    } else if (enemy.kind === KIND_SPLITTER) {
      ctx.fillStyle = '#4cc9f0';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#90e0ef';
      ctx.beginPath();
      ctx.arc(enemy.x - radius * 0.35, enemy.y - radius * 0.2, radius * 0.22, 0, Math.PI * 2);
      ctx.arc(enemy.x + radius * 0.35, enemy.y - radius * 0.2, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cinder: a flickering ember.
      const flicker = 1 + Math.sin(time * 9 + enemy.wobble) * 0.08;
      ctx.fillStyle = '#ff7a3c';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, radius * flicker, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9e5e';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Health bar when hurt.
    if (enemy.hp < enemy.maxHp) {
      const width = enemy.radius * 2;
      const x = enemy.x - width / 2;
      const y = enemy.y - enemy.radius - 10;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(x, y, width, 4);
      ctx.fillStyle = '#7bf1a8';
      ctx.fillRect(x, y, width * Math.max(0, enemy.hp / enemy.maxHp), 4);
    }
  }

  function drawHud(state, best) {
    const player = state.player;
    // HP bar, top left.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('HP', 22, 30);
    ctx.fillStyle = PALETTE.hpBack;
    ctx.beginPath();
    ctx.roundRect(56, 18, 190, 22, 8);
    ctx.fill();
    ctx.fillStyle = player.hp / player.maxHp < 0.3 ? PALETTE.danger : PALETTE.hp;
    ctx.beginPath();
    ctx.roundRect(56, 18, 190 * Math.max(0, player.hp / player.maxHp), 22, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, 256, 30);
    // Wave and enemies left, top centre.
    centredText(`WAVE ${Math.max(1, state.wave)}`, FIELD.width / 2, 22, 20, PALETTE.text);
    const remaining = state.enemies.length + state.spawnQueue;
    centredText(state.waveActive ? `${remaining} enemies left` : 'Wave cleared!', FIELD.width / 2, 46, 14, PALETTE.dim, 'normal');
    // Score, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`${state.score}`, FIELD.width - 22, 26);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = '13px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(`BEST ${best}`, FIELD.width - 22, 50);
    // Owned upgrades, bottom left.
    const owned = Object.keys(state.owned);
    if (owned.length > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = PALETTE.dim;
      ctx.font = '13px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(`Upgrades: ${owned.map((id) => `${id} ×${state.owned[id]}`).join('  ')}`, 22, FIELD.height - 22);
    }
    // Controls hint on the first wave.
    if (state.wave <= 1 && state.time < 14) {
      centredText('WASD move  ·  Mouse aim  ·  Click / Space fire  ·  P pause', FIELD.width / 2, FIELD.height - 22, 14, PALETTE.dim, 'normal');
    }
  }

  function drawBanner(banner) {
    if (!banner || banner.timer <= 0) return;
    const alpha = Math.min(1, banner.timer * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    centredText(banner.text, FIELD.width / 2, FIELD.height / 2 - 120, 44, PALETTE.gold);
    if (banner.sub) centredText(banner.sub, FIELD.width / 2, FIELD.height / 2 - 78, 17, PALETTE.text, 'normal');
    ctx.restore();
  }

  function drawTitle(state, best) {
    ctx.fillStyle = 'rgba(13, 11, 30, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    centredText('EMBERFALL', FIELD.width / 2, 168, 72, PALETTE.gold);
    centredText('ARENA OF THE LAST SPARK', FIELD.width / 2, 224, 20, PALETTE.text, 'normal');
    centredText('You are the last spark. The cinders are coming.', FIELD.width / 2, 268, 17, PALETTE.dim, 'normal');
    centredText('Clear 10 waves to become Arena Champion.', FIELD.width / 2, 296, 17, PALETTE.dim, 'normal');
    centredText('WASD move  ·  Mouse aim  ·  Click or Space to fire  ·  P pause', FIELD.width / 2, 348, 16, PALETTE.text, 'normal');
    const pulse = 0.65 + Math.sin(state.time * 4) * 0.35;
    ctx.save();
    ctx.globalAlpha = pulse;
    centredText('— PRESS SPACE OR CLICK TO START —', FIELD.width / 2, 408, 20, PALETTE.player);
    ctx.restore();
    if (best > 0) centredText(`Best score: ${best}`, FIELD.width / 2, 452, 16, PALETTE.dim, 'normal');
  }

  function drawUpgrade(state, upgrades) {
    ctx.fillStyle = 'rgba(13, 11, 30, 0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    centredText(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 108, 40, '#7bf1a8');
    centredText('Choose an upgrade — click a card or press 1, 2 or 3', FIELD.width / 2, 152, 17, PALETTE.text, 'normal');
    const rects = upgradeCardRects();
    upgrades.forEach((upgrade, i) => {
      const rect = rects[i];
      panel(rect.x, rect.y, rect.width, rect.height, '#1c1938', '#3d3670');
      centredText(upgrade.glyph, rect.x + rect.width / 2, rect.y + 42, 30, PALETTE.gold);
      centredText(upgrade.name, rect.x + rect.width / 2, rect.y + 88, 19, PALETTE.text);
      centredText(upgrade.desc, rect.x + rect.width / 2, rect.y + 118, 14, PALETTE.dim, 'normal');
      centredText(`[${i + 1}]`, rect.x + rect.width / 2, rect.y + 148, 14, PALETTE.dim, 'normal');
    });
    centredText(`Score ${state.score}  ·  Next: wave ${state.wave + 1}`, FIELD.width / 2, FIELD.height - 78, 16, PALETTE.dim, 'normal');
  }

  function drawOver(state, best, won) {
    ctx.fillStyle = won ? 'rgba(13, 11, 30, 0.6)' : 'rgba(20, 8, 16, 0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (won) {
      centredText('ARENA CHAMPION', FIELD.width / 2, 168, 56, PALETTE.gold);
      centredText('You cleared all 10 waves. The arena is yours.', FIELD.width / 2, 226, 18, PALETTE.text, 'normal');
    } else {
      centredText('THE SPARK FADES', FIELD.width / 2, 168, 56, PALETTE.danger);
      centredText(`The cinders took you on wave ${Math.max(1, state.wave)}.`, FIELD.width / 2, 226, 18, PALETTE.text, 'normal');
    }
    centredText(`SCORE  ${state.score}`, FIELD.width / 2, 292, 30, PALETTE.text);
    centredText(`Best ${best}   ·   Kills ${state.kills}   ·   Wave ${Math.max(1, state.wave)}`, FIELD.width / 2, 336, 16, PALETTE.dim, 'normal');
    const pulse = 0.65 + Math.sin(state.time * 4) * 0.35;
    ctx.save();
    ctx.globalAlpha = pulse;
    centredText(
      won ? '— SPACE: KEEP GOING (ENDLESS) —' : '— PRESS SPACE OR CLICK TO TRY AGAIN —',
      FIELD.width / 2, 408, 20, PALETTE.player,
    );
    ctx.restore();
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(13, 11, 30, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    centredText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 20, 48, PALETTE.text);
    centredText('Press P or Space to resume', FIELD.width / 2, FIELD.height / 2 + 34, 17, PALETTE.dim, 'normal');
  }

  function draw(state, screen, ui) {
    const dpr = resize();
    const view = computeView(canvas);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = PALETTE.background;
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.save();
    ctx.translate(view.offsetX, view.offsetY);
    ctx.scale(view.scale, view.scale);
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FIELD.width, FIELD.height);
    ctx.clip();
    drawArena(state);
    // Embers (score pickups).
    for (const ember of state.embers) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(ember.x, ember.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const enemy of state.enemies) drawEnemy(enemy, state.time);
    if (screen !== SCREEN_TITLE && screen !== SCREEN_OVER) drawPlayer(state.player, state.time);
    // Player bullets.
    ctx.fillStyle = PALETTE.bullet;
    for (const bullet of state.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Enemy bullets.
    ctx.fillStyle = PALETTE.enemyBullet;
    for (const bullet of state.enemyBullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Particles.
    for (const particle of state.particles) {
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Floating score text.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const text of state.texts) {
      ctx.globalAlpha = Math.max(0, text.life / 0.9);
      ctx.fillStyle = text.color;
      ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
      ctx.fillText(text.text, text.x, text.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_UPGRADE) drawHud(state, ui.best);
    drawBanner(ui.banner);
    if (screen === SCREEN_TITLE) drawTitle(state, ui.best);
    else if (screen === SCREEN_UPGRADE) drawUpgrade(state, ui.upgrades || []);
    else if (screen === SCREEN_OVER) drawOver(state, ui.best, false);
    else if (screen === SCREEN_WIN) drawOver(state, ui.best, true);
    else if (screen === SCREEN_PAUSED) drawPaused();
    // Low-health vignette.
    if (state.player.hp > 0 && state.player.hp / state.player.maxHp < 0.3 && screen === SCREEN_PLAY) {
      const pulse = 0.18 + Math.sin(state.time * 6) * 0.08;
      const gradient = ctx.createRadialGradient(
        FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.35,
        FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.75,
      );
      gradient.addColorStop(0, 'rgba(255, 77, 109, 0)');
      gradient.addColorStop(1, `rgba(255, 77, 109, ${pulse})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    ctx.restore();
  }

  return { draw };
}
