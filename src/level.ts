// The one level. The world is three views wide and two and a half
// tall; the two original platforms sit in the view the game opens on,
// with stair-stepped wings climbing both sides and a shelf across the
// top. Every rise is 90px, a comfortable held jump; the perch above the
// shelf wants a running one.
import Platform from './platform.ts';
import {World} from './world.ts';

const blue = 'rgb(190, 190, 255)';
const green = 'rgb(190, 255, 190)';
const pink = 'rgb(255, 190, 220)';

export function makeLevel(): World {
  const p = (left: number, top: number, right: number, color: string) =>
      new Platform(left, top, right, top + 20, color);
  return new World(1800, 720, [
    // The opening view.
    p(700, 530, 850, blue),
    p(900, 630, 1100, green),
    // Left wing.
    p(350, 630, 500, green),
    p(100, 540, 250, blue),
    p(350, 450, 500, green),
    p(100, 360, 250, blue),
    p(350, 270, 550, green),
    // Right wing.
    p(1250, 630, 1400, green),
    p(1500, 540, 1650, blue),
    p(1300, 450, 1450, green),
    p(1550, 360, 1700, blue),
    p(1300, 270, 1500, green),
    // The top.
    p(120, 180, 400, pink),
    p(600, 180, 1250, pink),
    p(880, 90, 980, pink),
  ], 40, 16);
}
