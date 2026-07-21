import {ctx, width, height, millis} from './runtime.js';
import * as Constants from './constants.js';
import * as World from './global_state.js';
import Todd from './Todd.js'

const todd = new Todd(Constants.side, 'rgb(255, 119, 0)');
todd.setPos(width / 2, height);
World.setup(height);

let previousFrameMillis = millis();

let instructionFadeStart = -1;
let instructionsShowing = true;

const gameKeys = new Set(Object.values(Constants.controllerKeys));

window.addEventListener('keydown', (e) => {
  if (gameKeys.has(e.code)) {
    e.preventDefault();
  }
  if (e.repeat) {
    return;
  }
  World.setControllerState(e.code, true);
  if (instructionsShowing && instructionFadeStart === -1) {
    instructionFadeStart = millis();
  }
});

window.addEventListener('keyup', (e) => {
  World.setControllerState(e.code, false);
});

function draw() {
  ctx.fillStyle = Constants.bg;
  ctx.fillRect(0, 0, width, height);

  for (const platform of World.platforms) {
    platform.draw();
  }

  if (Math.random() < Constants.blinkOdds) {
    todd.blink();
  }

  const t = millis();
  // Clamp dt so that a long rAF gap (hidden/occluded tab) integrates as one
  // short step; a multi-second dt makes the squish spring diverge.
  const dt = Math.min((t - previousFrameMillis) / 1000.0, 0.05);
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
      const elapsed = millis() - instructionFadeStart;
      if (elapsed > 1000) {
        textColor = Math.max(0, 200 * (1 - (elapsed - 1000) / 1000.0));
      }
      if (elapsed >= 2000) {
        instructionsShowing = false;
      }
    }
    const c = Math.round(textColor);
    ctx.fillStyle = `rgb(${c}, ${c}, ${c})`;
    ctx.font = '12px sans-serif';
    ctx.fillText("left/right arrows to move", 10, 20);
    ctx.fillText("spacebar to jump", 10, 36);
  }

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
