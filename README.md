# Emberfall — Arena of the Last Spark

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Calistaa113/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Calistaa113/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A 2D top-down arena shooter for the [best-game-01 bounty](https://make.fun/bounty/best-game-01).
You are the last spark in a dark arena. Waves of cinders close in — chasers,
spitters and splitters that burst into sparklings. Clear a wave, pick one of
three upgrades, and hold on: clear all 10 waves to become Arena Champion, then
keep going in endless mode.

## How to play

- **WASD / arrow keys** — move
- **Mouse** — aim
- **Click / Space** — fire
- **1 / 2 / 3 or click a card** — choose an upgrade between waves
- **P / Esc** — pause

## The loop

Survive the wave → collect score embers → choose an upgrade → next wave,
harder and faster. Score comes from kills, wave-clear bonuses and embers.
Lose all HP and the spark fades — press Space to try again.

## Files

- `game/index.html` — the page; everything else is an ES module under `game/src/`
- `game/src/main.js` — boot and the one loop, screens: title, play, paused, upgrade, over, win
- `game/src/world.js` — the simulation: player, bullets, enemies, embers, waves
- `game/src/enemies.js` — the four enemy kinds and how each one hunts
- `game/src/upgrades.js` — the seven upgrade cards offered between waves
- `game/src/render.js` — everything drawn: arena, wisp, enemies, HUD, screens
- `game/src/input.js` — keyboard and mouse, read as the world wants them
- `game/src/audio.js` — all sound synthesised with Web Audio, no audio files
- `game/src/config.js` — every tuning number in one place
- `game/src/random.js` — the seeded generator behind `?seed=`
- `game/src/view.js` — the one letterbox transform the canvas and mouse share
- `game/src/shots.js` — the `?shot=` scenes the screenshots are taken from
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes `dossier.json`

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network at runtime: every file the game loads lives under
`game/`. Screenshots are real renders of the game in a browser
(`?shot=start|play|upgrade|end&seed=1`).
