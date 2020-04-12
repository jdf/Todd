import p from './runtime.js';

export function clamp(v, min, max) {
  if (v < min) {
    return min;
  }
  if (v > max) {
    return max;
  }
  return v;
}

/**
 * @param a value at t=0
 * @param b value at t=1
 * @param t [0, 1] parameter
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * @param v value at t=0
 * @param w value at t=1
 * @param t [0, 1] parameter
 */
export function lerpVec(v, w, t) {
  return {x: lerp(v.x, w.x, t), y: lerp(v.y, w.y, t)};
}

export class TimeBasedAnimation {
  constructor(startValue, endValue, durationSeconds) {
    this.startValue = startValue;
    this.endValue = endValue;
    this.startMillis = p.millis();
    this.endMillis = Math.round(this.startMillis + durationSeconds * 1000);
  }

  isDone() {
    return p.millis() >= this.endMillis;
  }

  value() {
    if (this.isDone()) {
      return this.endValue;
    }
    return lerp(this.startValue, this.endValue,
        (p.millis() - this.startMillis) / (this.endMillis - this.startMillis));
  }
}

