// Create a namespace for p5.js; this is entirely for IntelliJ's benefit.
const p = new p5();

// bg color
const bg = 0;

// length of dude's side
const side = 30;

// A unitless constant that we apply to velocity while on the ground.
const friction = 0.95;

// A unitless constant that we apply to bearing when not accelerating.
const bearingFriction = 0.8;

// The following constants are pixels per second.
const gravity = 1400.0;
const maxvel = 240.0;
const accel = 900.0;
const airBending = 375.0;
const bearingAccel = 1200.0;
const jumpImpulse = -700.0;

const maxSquishVel = 80.0;

// Max vertical velocity while holding down jump.
const jumpTerminalVelocity = 250.0;
const terminalVelocity = 550.0;

// Blinking.
const blinkCycleSeconds = 0.25;

// Jump state.
const jumpStateIdle = 0;
const jumpStateJumping = 1;
const jumpStateLanded = 2;
let jumpState = jumpStateIdle;


function jumpControlIsEngaged() {
  return p.keyIsDown(32); // spacebar
}

function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

class Dude {
  constructor(sideLength, fillColor) {
    this.sideLength = sideLength;
    this.fillColor = fillColor;
    // Position of dude's bottom center.
    this.pos = {
      x: 0,
      y: 0
    };
    this.vel = {
      x: 0,
      y: 0
    };
    // The direction the eye is facing.
    this.bearing = 0;

    // Defect in vertical size, pixels.
    // Horizontal gets inverse.
    this.vSquish = 0;
    // per second
    this.vSquishVel = 0;

    this.blinkCumulativeTime = -1;
  }

  setPos(x, y) {
    this.pos = {
      x,
      y
    };
  }

  blink() {
    if (this.blinkCumulativeTime !== -1) return;
    this.blinkCumulativeTime = 0;
  }

  drawAt(x, y) {
    p.rectMode(p.CENTER);
    p.fill(this.fillColor);
    p.noStroke();
    const s = this.sideLength;
    const half = s / 2;
    const xsquish = this.vSquish * 0.8;
    const ysquish = this.vSquish * 1.6;
    p.rect(x, y - half - ysquish / 2.0,
      s - xsquish, s + ysquish, 3, 3);

    const eyeOffset =
        p.lerp(0, half - 6, Math.abs(this.bearing / maxvel));
    const pupilOffset =
        p.lerp(0, half - 3, Math.abs(this.bearing / maxvel));
    p.fill(255, 255, 255);
    const eyeVCenter = y - s + 8 - this.vSquish;
    p.ellipse(x + eyeOffset * Math.sign(this.bearing),
      eyeVCenter, 10, 10);
    p.fill(0);
    p.ellipse(x + pupilOffset * Math.sign(this.bearing),
      eyeVCenter, 3, 3);

    p.rectMode(p.CORNERS);
    if (this.blinkCumulativeTime !== -1) {
      const blinkCycle =
        this.blinkCumulativeTime / blinkCycleSeconds;
      p.fill(this.fillColor);
      const lidTopY = eyeVCenter - 6;
      const lidBottomY =
        lidTopY + 12 * sin(PI * blinkCycle);
      p.rect(x - half + 3, lidTopY, x + half - 3, lidBottomY);
    }
  }

  draw() {
    const {
      x,
      y
    } = this.pos;
    this.drawAt(x, y);
    const half = this.sideLength / 2;
    if (x < half) {
      this.drawAt(width + x, y);
    } else if (x > width - half) {
      this.drawAt(x - width, y);
    }
  }

  xAccel(a) {
    this.vel.x = clamp(this.vel.x + a, -maxvel, maxvel);
  }

  adjustBearing(a) {
    this.bearing =
      clamp(this.bearing + a, -maxvel, maxvel);
  }

  yAccel(a) {
    this.vel.y = this.vel.y + a;
    const term = jumpControlIsEngaged() ?
      jumpTerminalVelocity : terminalVelocity;
    if (this.vel.y > term) {
      this.vel.y = term;
    }
  }

  jump() {
    this.vel.y = jumpImpulse;
    this.vSquishVel = maxSquishVel;
  }

  applyFriction() {
    this.vel.x *= friction;
  }

  applyBearingFriction() {
    this.bearing *= bearingFriction;
  }

  move(dt) {
    if (this.blinkCumulativeTime !== -1) {
      this.blinkCumulativeTime += dt;
    }
    if (this.blinkCumulativeTime >= blinkCycleSeconds) {
      this.blinkCumulativeTime = -1;
    }
    this.pos.x += this.vel.x * dt;
    if (this.pos.x > width) {
      this.pos.x = 0;
    } else if (this.pos.x < 0) {
      this.pos.x = width;
    }
    this.pos.y += this.vel.y * dt;
    if (this.pos.y >= height &&
      jumpState === jumpStateJumping) {
      if (!jumpControlIsEngaged()) this.blink();  // blink on hard landing
      this.vSquishVel = -this.vel.y / 5.0;
      this.pos.y = height;
      this.vel.y = 0;
      jumpState = jumpStateLanded;
    }

    if (Math.abs(this.vSquishVel + this.vSquish) < 0.2) {
      this.vSquishVel = this.vSquish = 0;
    } else {
      // squish stiffness
      const k = 200.0;
      const damping = 8.5;

      const squishForce = -k * this.vSquish;
      const dampingForce = damping * this.vSquishVel;
      this.vSquishVel +=
        (squishForce - dampingForce) * dt;
      this.vSquishVel = clamp(
        this.vSquishVel, -maxSquishVel, maxSquishVel);
      this.vSquish += this.vSquishVel * dt;
    }
  }

  isInContactWithGround() {
    return this.pos.y === height;
  }
}

let dude;
let previousFrameMillis;

function setup() {
  p.createCanvas(600, 300);
  dude = new Dude(side, p.color(255, 119, 0));
  dude.setPos(width / 2, height);
  previousFrameMillis = p.millis();
}

function keyPressed() {
  if (p.key === ' ') {
    if (dude.isInContactWithGround()) {
      jumpState = jumpStateJumping;
    }
  }
}

function keyReleased() {
  if (p.key === ' ') {
    if (dude.isInContactWithGround()) {
      jumpState = jumpStateIdle;
    }
  }
}

const blinkOdds = 1 / 250.0;

let instructionFadeStart = -1;
let instructionsShowing = true;

function draw() {
  p.background(bg);

  if (p.random() < blinkOdds) {
    dude.blink();
  }

  const lefting = p.keyIsDown(p.LEFT_ARROW);
  const righting = p.keyIsDown(p.RIGHT_ARROW);

  const t = p.millis();
  const dt = (t - previousFrameMillis) / 1000.0;
  previousFrameMillis = t;

  const whichAccel = dude.isInContactWithGround() ? accel : airBending;

  if (lefting) {
    dude.adjustBearing(-bearingAccel * dt);
    dude.xAccel(-whichAccel * dt);
  } else if (righting) {
    dude.adjustBearing(bearingAccel * dt);
    dude.xAccel(whichAccel * dt);
  } else {
    dude.applyBearingFriction();
    if (dude.isInContactWithGround()) {
      dude.applyFriction();
    }
  }

  if (dude.isInContactWithGround()) {
    if (jumpState === jumpStateJumping) {
      dude.jump();
    }
  } else {
    dude.yAccel(gravity * dt);
  }
  dude.move(dt);
  dude.draw();

  if (instructionsShowing) {
    if (instructionFadeStart === -1 &&
        (lefting || righting ||
            jumpState === jumpStateJumping)) {
      instructionFadeStart = t;
    }

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