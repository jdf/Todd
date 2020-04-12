import * as Constants from './constants';
import Platform from './platform.js';

// Current state of controller "buttons".
export const controller = {
  left: false,
  right: false,
  jump: false,
};

// Jump state.
export const jumpStateIdle = 0;
export const jumpStateJumping = 1;
export const jumpStateLanded = 2;

class JumpState {
  constructor() {
    this.state = jumpStateIdle;
  }

  setState(s) {
    this.state = s;
  }

  getState() {
    return this.state;
  }
}

export const jumpState = new JumpState();

export const platforms = [
  new Platform(100, 110, 250, 130, 'rgb(190, 190, 255)'),
  new Platform(300, 210, 500, 230, 'rgb(190, 255, 190)'),
];
platforms.sort((a, b) => {
  return a.top === b.top ? 0 : Math.sign(a.top - b.top);
});

export const tumbleLevels = [];

for (const plat of platforms) {
  if (tumbleLevels.length > 0 &&
      tumbleLevels[tumbleLevels.length - 1] === plat.top) {
    continue;
  }
  tumbleLevels.push(plat.top);
}
tumbleLevels.push(height);

export function setControllerState(keyCode, isDown) {
  if (whichKey === Constants.controllerKeyCodes.jump) {
    controller.jump = isDown;
  } else if (whichKeyCode === Constants.controllerKeyCodes.left) {
    controller.left = isDown;
  } else if (whichKeyCode === Constants.controllerKeyCodes.right) {
    controller.right = isDown;
  }
}
