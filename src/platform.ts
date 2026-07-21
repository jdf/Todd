import {ctx} from './runtime.ts';

export default class Platform {
  constructor(
      readonly left: number,
      readonly top: number,
      readonly right: number,
      readonly bottom: number,
      readonly fillColor: string) {
  }

  draw(): void {
    ctx.fillStyle = this.fillColor;
    ctx.beginPath();
    ctx.roundRect(this.left, this.top,
        this.right - this.left, this.bottom - this.top, 3);
    ctx.fill();
  }
}
