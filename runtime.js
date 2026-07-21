// Canvas setup and timing.
export const width = 600;
export const height = 300;

const canvas = document.getElementById('todd');
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;
canvas.height = height * dpr;
canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;

export const ctx = canvas.getContext('2d');
ctx.scale(dpr, dpr);

export function millis() {
  return performance.now();
}
