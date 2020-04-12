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
  constructor(startValue, endValue, startMillis, durationSeconds) {
    this.startValue = startValue;
    this.endValue = endValue;
    this.startMillis = startMillis;
    this.endTime = Math.round(this.startTime + durationSeconds * 1000);
  }

  value(t) {
    if (t > this.endTime) {
      return this.endValue;
    }
    return lerp(this.startValue, this.endValue,
        (t - this.startTime) / (this.endTime - this.startTime));
  }
}

