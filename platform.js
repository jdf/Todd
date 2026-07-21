import {ctx} from './runtime.js';

export default class Platform {
  constructor(left, top, right, bottom, fillColor) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.fillColor = fillColor;
  }

  draw() {
    ctx.fillStyle = this.fillColor;
    ctx.beginPath();
    ctx.roundRect(this.left, this.top,
        this.right - this.left, this.bottom - this.top, 3);
    ctx.fill();
  }
}
