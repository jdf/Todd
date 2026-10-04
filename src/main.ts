import {
  ctx,
  width,
  height,
  millis,
  enterPixelSpace,
  toggleFullscreen,
} from './runtime.ts';
import * as Constants from './constants.ts';
import {Camera} from './camera.ts';
import {makeLevel} from './level.ts';
import Todd from './Todd.ts';

const world = makeLevel();
const camera = new Camera(world, width, height, Constants.cameraBox);

const todd = new Todd(world, Constants.side, 'rgb(255, 119, 0)');
todd.setPos(world.width / 2, world.floorY);
camera.center(todd.pos);

// A handle for the headless tests and for poking at the sim from the
// console. pause() stops the rAF loop after the pending frame; step(n)
// then advances exactly n frames at 60Hz; resume() restarts the loop.
let paused = false;
let lastFrameTime = 0;
let rafHandle = 0;
Object.assign(window, {
  toddDebug: {
    world,
    camera,
    todd,
    pause() {
      paused = true;
      cancelAnimationFrame(rafHandle);
    },
    step(n = 1) {
      for (let i = 0; i < n; i++) {
        lastFrameTime += 1000 / 60;
        draw(lastFrameTime);
      }
    },
    resume() {
      if (paused) {
        paused = false;
        rafHandle = requestAnimationFrame(draw);
      }
    },
  },
});

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

// HUD text is drawn in pixel space, sized relative to the view: 0.4
// units tall, which is 12px at a 600px-wide view.
function hudFont(u: number): string {
  return `${(0.4 * u).toFixed(1)}px sans-serif`;
}

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
  ctx.save();
  const u = enterPixelSpace();
  const c = Math.round(textColor);
  ctx.fillStyle = `rgb(${c}, ${c}, ${c})`;
  ctx.font = hudFont(u);
  ctx.fillText('left/right arrows to move', u / 3, u * 2 / 3);
  ctx.fillText('spacebar to jump', u / 3, u * 1.2);
  ctx.fillText('f for fullscreen', u / 3, u * 1.733);
  ctx.restore();
}

function drawDebug(): void {
  ctx.save();
  const u = enterPixelSpace();
  const {left, top, right, bottom} = Constants.cameraBox;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.strokeRect(Math.round(left * u) + 0.5, Math.round(top * u) + 0.5,
      Math.round((right - left) * u), Math.round((bottom - top) * u));
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgb(200, 200, 200)';
  ctx.font = hudFont(u);
  ctx.textAlign = 'right';
  ctx.fillText(`cam ${camera.x.toFixed(2)}, ${camera.y.toFixed(2)}`,
      (width - 1 / 3) * u, u * 2 / 3);
  ctx.fillText(`todd ${todd.pos.x.toFixed(2)}, ${todd.pos.y.toFixed(2)}`,
      (width - 1 / 3) * u, u * 1.2);
  ctx.restore();
}

function draw(t: DOMHighResTimeStamp): void {
  // Clamp dt so that a long rAF gap (hidden/occluded tab) integrates as one
  // short step; a multi-second dt makes the squish spring diverge. Never
  // integrate backwards: a frame with an earlier timestamp than the last
  // (a late-delivered rAF after synthetic steps) runs the exponential
  // decays in reverse and they explode.
  const dt = Math.min(Math.max(0, t - previousFrameMillis) / 1000.0, 0.05);
  previousFrameMillis = t;
  lastFrameTime = t;

  todd.maybeBlink(dt);

  const whichAccel = todd.isInContactWithGround() ? Constants.accel
      : Constants.airBending;

  if (world.controller.left) {
    todd.adjustBearing(-Constants.bearingAccel * dt);
    todd.xAccel(-whichAccel * dt);
  } else if (world.controller.right) {
    todd.adjustBearing(Constants.bearingAccel * dt);
    todd.xAccel(whichAccel * dt);
  } else {
    todd.applyBearingFriction(dt);
    if (todd.isInContactWithGround()) {
      todd.applyFriction(dt);
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

  if (!paused) {
    rafHandle = requestAnimationFrame(draw);
  }
}

rafHandle = requestAnimationFrame(draw);
