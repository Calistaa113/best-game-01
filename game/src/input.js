// Keyboard and mouse, read as the world wants them: a movement vector, an aim
// point in arena units, whether the trigger is held, and the one-shot actions
// (confirm, pause, upgrade choice) the screens consume once per press.

import { toArena } from './view.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CHOICE_1 = 4;
export const ACTION_CHOICE_2 = 8;
export const ACTION_CHOICE_3 = 16;

export function createInput(canvas) {
  const keys = new Set();
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let queuedActions = 0;

  function keyAction(code) {
    if (code === 'Space' || code === 'Enter') return ACTION_CONFIRM;
    if (code === 'KeyP' || code === 'Escape') return ACTION_PAUSE;
    if (code === 'Digit1' || code === 'Numpad1') return ACTION_CHOICE_1;
    if (code === 'Digit2' || code === 'Numpad2') return ACTION_CHOICE_2;
    if (code === 'Digit3' || code === 'Numpad3') return ACTION_CHOICE_3;
    return 0;
  }

  window.addEventListener('keydown', (event) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
    if (!event.repeat) {
      keys.add(event.code);
      queuedActions |= keyAction(event.code);
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', (event) => {
    const point = toArena(canvas, event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouseDown = true;
      const point = toArena(canvas, event.clientX, event.clientY);
      mouseX = point.x;
      mouseY = point.y;
      queuedActions |= ACTION_CONFIRM;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouseDown = false;
  });

  return {
    /** Normalised movement vector from WASD or the arrow keys. */
    move() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y };
    },
    /** Aim point in arena units; falls back to the arena centre. */
    aim() {
      return { x: mouseX, y: mouseY };
    },
    /** The trigger: mouse held, or Space held. */
    firing() {
      return mouseDown || keys.has('Space');
    },
    /** One-shot actions since the last call; calling this clears them. */
    takeActions() {
      const actions = queuedActions;
      queuedActions = 0;
      return actions;
    },
  };
}
