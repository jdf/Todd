import * as Constants from './constants.js';
import Platform from './platform.js';

// Current state of controller "buttons".
export const controller = {
  left: false,
  right: false,
  jump: false,
};

export const JumpState = {
  idle: 'idle',
  jumping: 'jumping',
  landed: 'landed',
};

let jumpState = JumpState.idle;

export function setJumpState(s) {
  jumpState = s;
}

export function isJumpJumping() { return jumpState === JumpState.jumping; }
export function isJumpLanded() { return jumpState === JumpState.landed; }
export function isJumpIdle() { return jumpState === JumpState.idle; }

export const platforms = [
  new Platform(100, 110, 250, 130, 'rgb(190, 190, 255)'),
  new Platform(300, 210, 500, 230, 'rgb(190, 255, 190)'),
];
platforms.sort((a, b) => {
  return a.top === b.top ? 0 : Math.sign(a.top - b.top);
});

export const tumbleLevels = [];

export function setup(worldHeight) {
  for (const plat of platforms) {
    if (tumbleLevels.length > 0 &&
        tumbleLevels[tumbleLevels.length - 1] === plat.top) {
      continue;
    }
    tumbleLevels.push(plat.top);
  }
  tumbleLevels.push(worldHeight);
}

export function setControllerState(keyCode, isDown) {
  if (keyCode === Constants.controllerKeyCodes.jump) {
    controller.jump = isDown;
  } else if (keyCode === Constants.controllerKeyCodes.left) {
    controller.left = isDown;
  } else if (keyCode === Constants.controllerKeyCodes.right) {
    controller.right = isDown;
  }
}
