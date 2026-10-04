// Canvas setup and timing: the only module that knows about the DOM.
//
// The game renders a fixed logical view of viewWidth x viewHeight
// world units (see constants.ts). The canvas is sized to the largest
// rectangle of that aspect ratio that fits the window, centered by
// CSS, so the window's remaining area forms letterbox or pillarbox
// bars. The context's base transform maps units to device pixels.
import {viewWidth, viewHeight} from './constants.ts';

export const width = viewWidth;
export const height = viewHeight;

const canvas = document.getElementById('todd') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d')!;

let dpr = 1;
// CSS pixels per world unit at the current window size.
export let pixelsPerUnit = 1;

function fit(): void {
  dpr = window.devicePixelRatio || 1;
  pixelsPerUnit =
      Math.min(window.innerWidth / width, window.innerHeight / height);
  const cssW = Math.round(width * pixelsPerUnit);
  const cssH = Math.round(height * pixelsPerUnit);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  // Assigning the backing size resets all context state, including the
  // transform, so the unit-to-device transform is reapplied every time.
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
}

fit();
window.addEventListener('resize', fit);

/**
 * Switches the context to CSS-pixel space for crisp text and hairlines;
 * pair with ctx.save()/restore(). Returns pixels per unit so callers
 * can place things relative to the view.
 */
export function enterPixelSpace(): number {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return pixelsPerUnit;
}

export function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
  } else {
    void document.documentElement.requestFullscreen().catch(() => {});
  }
}

export function millis(): number {
  return performance.now();
}
