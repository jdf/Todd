import {ctx, width, height, millis, toggleFullscreen} from './runtime.ts';
import * as Constants from './constants.ts';
import {Camera} from './camera.ts';
import {makeLevel} from './level.ts';
import Todd from './Todd.ts';

const world = makeLevel();
const camera = new Camera(world, width, height, Constants.cameraBox);

const todd = new Todd(world, Constants.side, 'rgb(255, 119, 0)');
todd.setPos(world.width / 2, world.floorY);
camera.center(todd.pos);

// A handle for the headless smoke test and for poking at the sim from
// the console.
Object.assign(window, {toddDebug: {world, camera, todd}});

let previousFrameMillis = millis();

let instructionFadeStart = -1;
let instructionsShowing = true;
let showDebug = false;

const gameKeys = new Set<string>(Object.values(Constants.controllerKeys));

window.addEventListener('keydown', (e) => {
  if (gameKeys.has(e.code)) {
    e.preventDefault();
  }
  if (e.repeat) {
    return;
  }
  if (e.code === Constants.fullscreenKey) {
    toggleFullscreen();
    return;
  }
  if (e.code === Constants.debugKey) {
    showDebug = !showDebug;
    return;
  }
  world.setControllerState(e.code, true);
  if (instructionsShowing && instructionFadeStart === -1) {
    instructionFadeStart = millis();
  }
});

window.addEventListener('keyup', (e) => {
  world.setControllerState(e.code, false);
});

function drawInstructions(t: DOMHighResTimeStamp): void {
  let textColor = 200;
  if (instructionFadeStart !== -1) {
    const elapsed = t - instructionFadeStart;
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
  ctx.fillText('left/right arrows to move', 10, 20);
  ctx.fillText('spacebar to jump', 10, 36);
  ctx.fillText('f for fullscreen', 10, 52);
}

function drawDebug(): void {
  const {left, top, right, bottom} = Constants.cameraBox;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(left + 0.5, top + 0.5, right - left, bottom - top);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgb(200, 200, 200)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`cam ${camera.x.toFixed(0)}, ${camera.y.toFixed(0)}`,
      width - 10, 20);
  ctx.fillText(`todd ${todd.pos.x.toFixed(0)}, ${todd.pos.y.toFixed(0)}`,
      width - 10, 36);
  ctx.textAlign = 'left';
}

function draw(t: DOMHighResTimeStamp): void {
  // Clamp dt so that a long rAF gap (hidden/occluded tab) integrates as one
  // short step; a multi-second dt makes the squish spring diverge.
  const dt = Math.min((t - previousFrameMillis) / 1000.0, 0.05);
  previousFrameMillis = t;

  if (Math.random() < Constants.blinkOdds) {
    todd.blink();
  }

  const whichAccel = todd.isInContactWithGround() ? Constants.accel
      : Constants.airBending;

  if (world.controller.left) {
    todd.adjustBearing(-Constants.bearingAccel * dt);
    todd.xAccel(-whichAccel * dt);
  } else if (world.controller.right) {
    todd.adjustBearing(Constants.bearingAccel * dt);
    todd.xAccel(whichAccel * dt);
  } else {
    todd.applyBearingFriction();
    if (todd.isInContactWithGround()) {
      todd.applyFriction();
    }
  }

  todd.move(dt);
  camera.follow(todd.pos);

  ctx.fillStyle = Constants.bg;
  ctx.fillRect(0, 0, width, height);

  // World space.
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  world.drawTerrain(ctx);
  for (const p of world.platforms) {
    if (camera.sees(p.left, p.top, p.right, p.bottom)) {
      p.draw(ctx);
    }
  }
  todd.draw(ctx);
  ctx.restore();

  // View space.
  if (instructionsShowing) {
    drawInstructions(t);
  }
  if (showDebug) {
    drawDebug();
  }

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
