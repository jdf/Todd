import * as Constants from './constants.ts';
import Platform from './platform.ts';

// Current state of controller "buttons".
export const controller = {
  left: false,
  right: false,
  jump: false,
};

export enum JumpState {
  idle = 'idle',
  jumping = 'jumping',
  landed = 'landed',
}

let jumpState = JumpState.idle;

export function setJumpState(s: JumpState): void {
  jumpState = s;
}

export function isJumpJumping(): boolean { return jumpState === JumpState.jumping; }
export function isJumpLanded(): boolean { return jumpState === JumpState.landed; }
export function isJumpIdle(): boolean { return jumpState === JumpState.idle; }

export const platforms: Platform[] = [
  new Platform(100, 110, 250, 130, 'rgb(190, 190, 255)'),
  new Platform(300, 210, 500, 230, 'rgb(190, 255, 190)'),
];
platforms.sort((a, b) => {
  return a.top === b.top ? 0 : Math.sign(a.top - b.top);
});

export const tumbleLevels: number[] = [];

export function setup(worldHeight: number): void {
  for (const plat of platforms) {
    if (tumbleLevels.length > 0 &&
        tumbleLevels[tumbleLevels.length - 1] === plat.top) {
      continue;
    }
    tumbleLevels.push(plat.top);
  }
  tumbleLevels.push(worldHeight);
}

export function setControllerState(code: string, isDown: boolean): void {
  if (code === Constants.controllerKeys.jump) {
    controller.jump = isDown;
  } else if (code === Constants.controllerKeys.left) {
    controller.left = isDown;
  } else if (code === Constants.controllerKeys.right) {
    controller.right = isDown;
  }
}
