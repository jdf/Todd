// The one level, authored on the unit grid. The world is three views
// wide and two and a half tall; the two original platforms sit in the
// view the game opens on, with stair-stepped wings climbing both sides
// and a shelf across the top. Every rise is 3, a comfortable held
// jump; the perch above the shelf wants a running one.
import Platform from './platform.ts';
import {World} from './world.ts';

const blue = 'rgb(190, 190, 255)';
const green = 'rgb(190, 255, 190)';
const pink = 'rgb(255, 190, 220)';

const thickness = 2 / 3;
const groundDepth = 1;
const wallThickness = 0.5;

export function makeLevel(): World {
  const p = (left: number, top: number, right: number, color: string) =>
      new Platform(left, top, right, top + thickness, color);
  return new World(60, 24, [
    // The opening view.
    p(23, 18, 28, blue),
    p(30, 21, 37, green),
    // Left wing.
    p(12, 21, 17, green),
    p(3, 18, 8, blue),
    p(12, 15, 17, green),
    p(3, 12, 8, blue),
    p(12, 9, 18, green),
    // Right wing.
    p(42, 21, 47, green),
    p(50, 18, 55, blue),
    p(43, 15, 48, green),
    p(52, 12, 57, blue),
    p(43, 9, 50, green),
    // The top.
    p(4, 6, 13, pink),
    p(20, 6, 42, pink),
    p(29, 3, 33, pink),
  ], groundDepth, wallThickness);
}
