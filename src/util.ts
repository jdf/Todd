import {millis} from './runtime.ts';

export interface Vec {
  x: number;
  y: number;
}

export function clamp(v: number, min: number, max: number): number {
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
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * @param v value at t=0
 * @param w value at t=1
 * @param t [0, 1] parameter
 */
export function lerpVec(v: Vec, w: Vec, t: number): Vec {
  return {x: lerp(v.x, w.x, t), y: lerp(v.y, w.y, t)};
}

export class TimeBasedAnimation {
  readonly startValue: number;
  readonly endValue: number;
  readonly startMillis: number;
  readonly endMillis: number;

  constructor(startValue: number, endValue: number, durationSeconds: number) {
    this.startValue = startValue;
    this.endValue = endValue;
    this.startMillis = millis();
    this.endMillis = Math.round(this.startMillis + durationSeconds * 1000);
  }

  isDone(): boolean {
    return millis() >= this.endMillis;
  }

  value(): number {
    if (this.isDone()) {
      return this.endValue;
    }
    return lerp(this.startValue, this.endValue,
        (millis() - this.startMillis) / (this.endMillis - this.startMillis));
  }
}
