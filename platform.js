import p from './runtime.js'
export default class Platform {
  constructor(left, top, right, bottom, fillColor) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.fillColor = fillColor;
  }

  draw() {
    p.rectMode(p.CORNERS);
    p.fill(color(this.fillColor));
    p.rect(this.left, this.top, this.right, this.bottom, 3, 3);
  }
}

