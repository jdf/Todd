// Canvas setup and timing: the only module that knows about the DOM.
//
// The game renders into a fixed logical view (viewWidth x viewHeight,
// see constants.ts). The canvas is sized to the largest rectangle of
// that aspect ratio that fits the window, centered by CSS, so the
// window's remaining area forms letterbox or pillarbox bars.
import {viewWidth, viewHeight} from './constants.ts';

export const width = viewWidth;
export const height = viewHeight;

const canvas = document.getElementById('todd') as HTMLCanvasElement;
export const ctx = canvas.getContext('2d')!;

function fit(): void {
  const dpr = window.devicePixelRatio || 1;
  const scale = Math.min(window.innerWidth / width, window.innerHeight / height);
  const cssW = Math.round(width * scale);
  const cssH = Math.round(height * scale);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  // Assigning the backing size resets all context state, including the
  // transform, so the view-to-device transform is reapplied every time.
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
}

fit();
window.addEventListener('resize', fit);

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
