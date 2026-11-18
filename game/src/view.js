// The one place that knows how the logical arena maps onto the canvas: the game
// is drawn letterboxed inside the window, and the mouse is read back through the
// same transform, so the renderer and the input can never disagree about where
// the player is pointing.

import { FIELD } from './config.js';

/** { scale, offsetX, offsetY } for the canvas's current CSS size. */
export function computeView(canvas) {
  const width = canvas.clientWidth || FIELD.width;
  const height = canvas.clientHeight || FIELD.height;
  const scale = Math.min(width / FIELD.width, height / FIELD.height);
  return {
    scale,
    offsetX: (width - FIELD.width * scale) / 2,
    offsetY: (height - FIELD.height * scale) / 2,
  };
}

/** A client-space point (mouse event) in arena units. */
export function toArena(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const view = computeView(canvas);
  return {
    x: (clientX - rect.left - view.offsetX) / view.scale,
    y: (clientY - rect.top - view.offsetY) / view.scale,
  };
}
