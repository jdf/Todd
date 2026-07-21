import * as Constants from './constants.ts';
import Platform from './platform.ts';

export interface Controller {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export class World {
  readonly platforms: Platform[];
  // The heights, in ascending order, at which a tumble can end: each
  // distinct platform top, then the floor.
  readonly tumbleLevels: number[] = [];
  readonly controller: Controller = {left: false, right: false, jump: false};

  constructor(
      readonly width: number,
      readonly height: number,
      platforms: Platform[]) {
    this.platforms = [...platforms].sort((a, b) => a.top - b.top);
    for (const plat of this.platforms) {
      if (this.tumbleLevels[this.tumbleLevels.length - 1] !== plat.top) {
        this.tumbleLevels.push(plat.top);
      }
    }
    this.tumbleLevels.push(height);
  }

  setControllerState(code: string, isDown: boolean): void {
    if (code === Constants.controllerKeys.jump) {
      this.controller.jump = isDown;
    } else if (code === Constants.controllerKeys.left) {
      this.controller.left = isDown;
    } else if (code === Constants.controllerKeys.right) {
      this.controller.right = isDown;
    }
  }
}
