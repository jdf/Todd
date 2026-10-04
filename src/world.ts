import * as Constants from './constants.ts';
import Platform from './platform.ts';

export interface Controller {
  left: boolean;
  right: boolean;
  jump: boolean;
}

const terrainColor = 'rgb(105, 88, 72)';
const grassColor = 'rgb(170, 225, 150)';
const grassDepth = 4;

export class World {
  readonly platforms: Platform[];
  // The heights, in ascending order, at which a tumble can end: each
  // distinct platform top, then the floor.
  readonly tumbleLevels: number[] = [];
  readonly controller: Controller = {left: false, right: false, jump: false};

  /**
   * @param width world width in pixels, walls included
   * @param floorY y of the ground surface Todd stands on
   * @param platforms in any order
   * @param groundDepth thickness of the drawn ground below floorY
   * @param wallThickness thickness of the drawn walls inside each edge
   */
  constructor(
      readonly width: number,
      readonly floorY: number,
      platforms: Platform[],
      readonly groundDepth = 0,
      readonly wallThickness = 0) {
    this.platforms = [...platforms].sort((a, b) => a.top - b.top);
    for (const plat of this.platforms) {
      if (this.tumbleLevels[this.tumbleLevels.length - 1] !== plat.top) {
        this.tumbleLevels.push(plat.top);
      }
    }
    this.tumbleLevels.push(floorY);
  }

  /** Total height: the floor plus the ground drawn beneath it. */
  get height(): number {
    return this.floorY + this.groundDepth;
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

  /** Ground and walls, in world coordinates. */
  drawTerrain(ctx: CanvasRenderingContext2D): void {
    const {width, floorY, groundDepth, wallThickness} = this;
    ctx.fillStyle = terrainColor;
    ctx.fillRect(0, floorY, width, groundDepth);
    ctx.fillRect(0, 0, wallThickness, floorY);
    ctx.fillRect(width - wallThickness, 0, wallThickness, floorY);
    ctx.fillStyle = grassColor;
    ctx.fillRect(wallThickness, floorY, width - 2 * wallThickness, grassDepth);
  }
}
