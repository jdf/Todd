import p from './runtime.js';
import * as Constants from './constants.js';
import * as World from './global_state.js';
import Todd from './Todd.js'

let todd;
let previousFrameMillis;

// noinspection JSUnusedLocalSymbols
export function setup() {
  p.createCanvas(600, 300);
  todd = new Todd(Constants.side, p.color(255, 119, 0));
  todd.setPos(width / 2, height);
  previousFrameMillis = p.millis();
  World.setup(height);
}

let instructionFadeStart = -1;
let instructionsShowing = true;

export function keyPressed() {
  World.setControllerState(p.keyCode, true);
  if (instructionsShowing && instructionFadeStart === -1) {
    instructionFadeStart = p.millis();
  }
}

export function keyReleased() {
  World.setControllerState(p.keyCode, false);
}

// noinspection JSUnusedLocalSymbols
export function draw() {
  p.background(Constants.bg);

  for (const platform of World.platforms) {
    platform.draw();
  }

  if (p.random() < Constants.blinkOdds) {
    todd.blink();
  }

  const t = p.millis();
  const dt = (t - previousFrameMillis) / 1000.0;
  previousFrameMillis = t;

  const whichAccel = todd.isInContactWithGround() ? Constants.accel
      : Constants.airBending;

  if (World.controller.left) {
    todd.adjustBearing(-Constants.bearingAccel * dt);
    todd.xAccel(-whichAccel * dt);
  } else if (World.controller.right) {
    todd.adjustBearing(Constants.bearingAccel * dt);
    todd.xAccel(whichAccel * dt);
  } else {
    todd.applyBearingFriction();
    if (todd.isInContactWithGround()) {
      todd.applyFriction();
    }
  }

  todd.move(dt);
  todd.draw();

  if (instructionsShowing) {
    let textColor = 200;
    if (instructionFadeStart !== -1) {
      const elapsed = p.millis() - instructionFadeStart;
      if (elapsed > 1000) {
        textColor = 200 * (1 - (elapsed - 1000) / 1000.0);
      }
      if (elapsed >= 2000) {
        instructionsShowing = false;
      }
    }
    p.fill(textColor);
    p.text("left/right arrows to move", 10, 20);
    p.text("spacebar to jump", 10, 36);
  }
}