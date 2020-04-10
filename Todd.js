// Create a namespace for p5.js; this is entirely for IntelliJ's benefit.
const p = new p5();

// bg color
const bg = 0;

// length of dude's side
const side = 30;

// A unitless constant that we apply to velocity while on the ground.
const friction = 0.83;

// A unitless constant that we apply to bearing when not accelerating.
const bearingFriction = 0.8;

// The following constants are pixels per second.
const gravity = 1400.0;
const maxvel = 240.0;
const accel = 900.0;
const airBending = 575.0;
const bearingAccel = 1200.0;
const jumpImpulse = -350.0;

const maxSquishVel = 80.0;

// Max vertical velocity while holding down jump.
const jumpTerminalVelocity = 350.0;
const terminalVelocity = 550.0;

// Blinking.
const blinkOdds = 1 / 300.0;
const blinkCycleSeconds = 0.25;

// Current state of controller "buttons".
const controller = {
  left: false,
  right: false,
  jump: false,
};

// Jump state.
const jumpStateIdle = 0;
const jumpStateJumping = 1;
const jumpStateLanded = 2;

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

const jumpState = new JumpState();

let shouldJump = false;

function clamp(v, min, max) {
  if (v < min) {
    return min;
  }
  if (v > max) {
    return max;
  }
  return v;
}

class Platform {
  constructor(left, top, right, bottom, fillColor) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    this.fillColor = fillColor;
  }

  draw() {
    p.rectMode(p.CORNERS);
    p.fill(color(this.fillColor));
    p.rect(this.left, this.top, this.right, this.bottom, 3, 3);
  }
}

const platforms = [
  new Platform(100, 110, 250, 130, 'rgb(190, 190, 255)'),
  new Platform(300, 210, 500, 230, 'rgb(190, 255, 190)'),
];

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

    // A quantity >= 0 when jumpState is jumpStateJumping.
    // Used in calculating gravity during jump.
    this.initialJumpSpeed = -1;
  }

  // Maps an x-speed to an integer in [0,2].
  speedStepFunction(x) {
    if (x < maxvel * .333) {
      return 0;
    }
    if (x < maxvel * .666) {
      return 1;
    }
    return 2;
  }

  getJumpImpulse(speed) {
    return jumpImpulse * [1.0, 1.0, 1.2][this.speedStepFunction(speed)];
  }

  getGravity() {
    if (this.vel.y < 0) {
      // going up!
      return gravity * (controller.jump ? 0.55 : 1.0);
    }
    return gravity;
  }

  setPos(x, y) {
    this.pos = {
      x,
      y
    };
  }

  blink() {
    if (this.blinkCumulativeTime !== -1) {
      return;
    }
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
          lidTopY + 12 * Math.sin(Math.PI * blinkCycle);
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
    const term = controller.jump ? jumpTerminalVelocity : terminalVelocity;
    if (this.vel.y > term) {
      this.vel.y = term;
    }
  }

  jump() {
    jumpState.setState(jumpStateJumping);
    this.initialJumpSpeed = Math.abs(this.vel.x);
    this.vel.y = this.getJumpImpulse(this.initialJumpSpeed);
    this.vSquishVel = maxSquishVel;
  }

  applyFriction() {
    this.vel.x *= friction;
  }

  applyBearingFriction() {
    this.bearing *= bearingFriction;
  }

  left() {
    return this.pos.x - this.sideLength / 2;
  }

  right() {
    return this.pos.x + this.sideLength / 2;
  }

  // Y value of surface top or -1 for not landing.
  getContactHeight() {
    if (this.pos.y >= height) {
      return height;
    }
    // can't land if we're moving up
    if (this.vel.y < 0) {
      return -1;
    }
    for (const plat of platforms) {
      if (this.pos.y >= plat.top && this.pos.y <= plat.bottom && this.right()
          >= plat.left && this.left() <= plat.right) {
        return plat.top;
      }
    }
    return -1;
  }

  move(dt) {
    this.yAccel(this.getGravity() * dt);
    if (this.isInContactWithGround()) {
      if (shouldJump) {
        this.jump();
        shouldJump = false;
      }
    }

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

    // Collisions.
    const currentY = this.pos.y;
    this.pos.y = currentY + this.vel.y * dt;
    let colliding = false;
    if (this.pos.y >= height) {
      colliding = true;
      this.pos.y = height;
    } else {
      for (const plat of platforms) {
        if (currentY <= plat.top && this.pos.y >= plat.top &&
            this.right() >= plat.left && this.left() <= plat.right) {
          colliding = true;
          this.pos.y = plat.top;
          break;
        }
      }
    }
    const oldvel = this.vel.y;
    if (colliding) {
      this.vel.y = 0;
    }
    if (jumpState.getState() === jumpStateJumping) {
      if (colliding) {
        // blink on hard landing
        if (oldvel > terminalVelocity * 0.95) {
          this.blink();
        }
        this.vSquishVel = -oldvel / 5.0;
        jumpState.setState(controller.jump ? jumpStateLanded : jumpStateIdle);
      }
    } else if (!colliding) {
      jumpState.setState(jumpStateJumping);  // we fell off a platform
      // Squish, but, if already squishing, squish in that direction.
      if (maxSquishVel > Math.abs(this.vSquishVel)) {
        this.vSquishVel = maxSquishVel * Math.sign(this.vSquishVel);
      }
    }

    if (Math.abs(this.vSquishVel + this.vSquish) < 0.2) {
      // Squish damping when the energy is below threshold.
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
    return this.getContactHeight() !== -1;
  }
}

let dude;
let previousFrameMillis;

// noinspection JSUnusedLocalSymbols
function setup() {
  p.createCanvas(600, 300);
  dude = new Dude(side, p.color(255, 119, 0));
  dude.setPos(width / 2, height);
  previousFrameMillis = p.millis();
}

function setControllerState(isDown) {
  if (p.key === ' ') {
    controller.jump = isDown;
  } else if (p.keyCode === p.LEFT_ARROW) {
    controller.left = isDown;
  } else if (p.keyCode === p.RIGHT_ARROW) {
    controller.right = isDown;
  }
}

// noinspection JSUnusedLocalSymbols
function keyPressed() {
  setControllerState(true);
  if (p.key === ' ' && dude.isInContactWithGround()) {
    shouldJump = true;
  }
}

// noinspection JSUnusedLocalSymbols
function keyReleased() {
  setControllerState(false);
  if (p.key === ' ' && dude.isInContactWithGround()) {
    jumpState.setState(jumpStateIdle);
  }
}

let instructionFadeStart = -1;
let instructionsShowing = true;

// noinspection JSUnusedLocalSymbols
function draw() {
  p.background(bg);

  for (const platform of platforms) {
    platform.draw();
  }

  if (p.random() < blinkOdds) {
    dude.blink();
  }

  const t = p.millis();
  const dt = (t - previousFrameMillis) / 1000.0;
  previousFrameMillis = t;

  const whichAccel = dude.isInContactWithGround() ? accel : airBending;

  if (controller.left) {
    dude.adjustBearing(-bearingAccel * dt);
    dude.xAccel(-whichAccel * dt);
  } else if (controller.right) {
    dude.adjustBearing(bearingAccel * dt);
    dude.xAccel(whichAccel * dt);
  } else {
    dude.applyBearingFriction();
    if (dude.isInContactWithGround()) {
      dude.applyFriction();
    }
  }

  dude.move(dt);
  dude.draw();

  if (instructionsShowing) {
    if (instructionFadeStart === -1 &&
        (controller.left || controller.right ||
            jumpState.getState() === jumpStateJumping)) {
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