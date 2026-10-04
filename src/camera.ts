import {clamp, type Vec} from './util.ts';
import {type World} from './world.ts';

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * A push-box camera. `x`/`y` is the world position of the view's
 * top-left corner. The target may roam anywhere inside `box` (given in
 * view coordinates) without moving the camera; when it crosses an edge
 * the camera moves exactly enough to keep it on that edge. The view
 * never leaves the world's bounds.
 */
export class Camera {
  x = 0;
  y = 0;

  constructor(
      readonly world: World,
      readonly viewWidth: number,
      readonly viewHeight: number,
      readonly box: Box) {
  }

  /** Puts the target at the center of the box, subject to world bounds. */
  center(target: Vec): void {
    this.x = target.x - (this.box.left + this.box.right) / 2;
    this.y = target.y - (this.box.top + this.box.bottom) / 2;
    this.clampToWorld();
  }

  follow(target: Vec): void {
    const vx = target.x - this.x;
    const vy = target.y - this.y;
    if (vx < this.box.left) {
      this.x = target.x - this.box.left;
    } else if (vx > this.box.right) {
      this.x = target.x - this.box.right;
    }
    if (vy < this.box.top) {
      this.y = target.y - this.box.top;
    } else if (vy > this.box.bottom) {
      this.y = target.y - this.box.bottom;
    }
    this.clampToWorld();
  }

  private clampToWorld(): void {
    this.x = clamp(this.x, 0, Math.max(0, this.world.width - this.viewWidth));
    this.y = clamp(this.y, 0, Math.max(0, this.world.height - this.viewHeight));
  }

  /** Whether any part of the world-space rect is in view. */
  sees(left: number, top: number, right: number, bottom: number): boolean {
    return right >= this.x && left <= this.x + this.viewWidth &&
        bottom >= this.y && top <= this.y + this.viewHeight;
  }
}
