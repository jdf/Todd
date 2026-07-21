import {ctx, width, height} from './runtime.ts';
import * as Constants from './constants.ts';
import * as World from './global_state.ts';
import {
  clamp,
  lerp,
  lerpVec,
  TimeBasedAnimation,
  type Vec
} from './util.ts';

class TumbleAnimation {
  startAngle = 0;
  targetHeight: number;

  constructor(readonly sign: number, private startHeight: number) {
    this.targetHeight = this.nextTumbleHeight(startHeight);
  }

  nextTumbleHeight(height: number): number {
    for (const h of World.tumbleLevels) {
      if (h > height) {
        return h;
      }
    }
    throw new Error(`nowhere to tumble to from ${height}`);
  }

  angleFor(height: number): number {
    if (height <= this.startHeight) {
      return this.startAngle;
    }

    if (height >= this.targetHeight) {
      this.startHeight = this.targetHeight;
      this.targetHeight = this.nextTumbleHeight(this.startHeight);
      this.startAngle += (Math.PI / 2.0) * this.sign;
    }

    const totalDelta = this.targetHeight - this.startHeight;
    const delta = height - this.startHeight;
    const ratio = delta / totalDelta;

    return this.startAngle + ratio * (Math.PI / 2.0) * this.sign;
  }
}

export default class Todd {
  // Position of dude's bottom center.
  pos: Vec = {x: 0, y: 0};
  vel: Vec = {x: 0, y: 0};

  // The direction the eye is facing.
  bearing = 0;

  // Defect in vertical size, pixels.
  // Horizontal gets inverse.
  vSquish = 0;
  // per second
  vSquishVel = 0;

  blinkCumulativeTime = -1;

  // A quantity >= 0 when jumpState is jumping.
  // Used in calculating gravity during jump.
  initialJumpSpeed = -1;

  // Tumbling!
  tumbleAnimation: TumbleAnimation | null = null;
  // During tumbling, this animates to 1, which means completely centered.
  // When tumbling ends, this animates to 0, which means "where it wants to be".
  eyeCentering = 0;
  eyeCenteringAnimation: TimeBasedAnimation | null = null;

  constructor(readonly sideLength: number, readonly fillColor: string) {
  }

  // Maps an x-velocity to an integer in [0,2].
  speedStepFunction(xVel: number): number {
    xVel = Math.abs(xVel);
    if (xVel < Constants.maxvel * .333) {
      return 0;
    }
    if (xVel < Constants.maxvel * .666) {
      return 1;
    }
    return 2;
  }

  // The platform has a width differing from its apparent width, depending on
  // your speed. The slower you are, the narrower the platform is.
  platformMargin(xVel: number): number {
    return [8, 0, -5][this.speedStepFunction(xVel)];
  }

  getJumpImpulse(speed: number): number {
    return Constants.jumpImpulse * [1.0, 1.0, 1.2][this.speedStepFunction(
        speed)];
  }

  getGravity(): number {
    if (this.vel.y < 0) {
      // going up!
      return Constants.gravity * (World.controller.jump ? 0.55 : 1.0);
    }
    return Constants.gravity;
  }

  setPos(x: number, y: number): void {
    this.pos = {x, y};
  }

  blink(): void {
    if (this.blinkCumulativeTime !== -1) {
      return;
    }
    this.blinkCumulativeTime = 0;
  }

  drawAt(x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);

    const s = this.sideLength;
    const half = s / 2;

    if (this.tumbleAnimation != null) {
      ctx.translate(0, -half);
      ctx.rotate(this.tumbleAnimation.angleFor(this.pos.y));
      ctx.translate(0, half);
    }

    const xsquish = this.vSquish * 0.8;
    const ysquish = this.vSquish * 1.6;

    // Body: a rounded rect centered at (0, -(half + ysquish/2)).
    const bodyW = s - xsquish;
    const bodyH = s + ysquish;
    const bodyCenterY = -(half + ysquish / 2.0);
    ctx.fillStyle = this.fillColor;
    ctx.beginPath();
    ctx.roundRect(-bodyW / 2, bodyCenterY - bodyH / 2, bodyW, bodyH, 3);
    ctx.fill();

    const eyeVCenter = -s + 8 - this.vSquish;
    const eyeOffset = lerp(0, half - 6,
        Math.abs(this.bearing / Constants.maxvel));
    const pupilOffset = lerp(0, half - 3,
        Math.abs(this.bearing / Constants.maxvel));
    let eyePos: Vec = {x: eyeOffset * Math.sign(this.bearing), y: eyeVCenter};
    let pupilPos: Vec =
        {x: pupilOffset * Math.sign(this.bearing), y: eyeVCenter};
    if (this.eyeCentering !== 0) {
      const center = {x: 0, y: -half};
      eyePos = lerpVec(eyePos, center, this.eyeCentering);
      pupilPos = lerpVec(pupilPos, center, this.eyeCentering);
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(eyePos.x, eyePos.y, 5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(pupilPos.x, pupilPos.y, 1.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.blinkCumulativeTime !== -1) {
      const blinkCycle = this.blinkCumulativeTime / Constants.blinkCycleSeconds;
      const lidTopY = eyePos.y - 6;
      const lidHeight = 12 * Math.sin(Math.PI * blinkCycle);
      ctx.fillStyle = this.fillColor;
      ctx.fillRect(-half + 3, lidTopY, s - 6, lidHeight);
    }
    ctx.restore();
  }

  draw(): void {
    const {x, y} = this.pos;
    this.drawAt(x, y);
    const half = this.sideLength / 2;
    if (x < half) {
      this.drawAt(width + x, y);
    } else if (x > width - half) {
      this.drawAt(x - width, y);
    }
  }

  xAccel(a: number): void {
    this.vel.x = clamp(this.vel.x + a, -Constants.maxvel, Constants.maxvel);
  }

  adjustBearing(a: number): void {
    this.bearing =
        clamp(this.bearing + a, -Constants.maxvel, Constants.maxvel);
  }

  yAccel(a: number): void {
    this.vel.y = this.vel.y + a;
    const term = World.controller.jump ? Constants.jumpTerminalVelocity
        : Constants.terminalVelocity;
    if (this.vel.y > term) {
      this.vel.y = term;
    }
  }

  jump(): void {
    World.setJumpState(World.JumpState.jumping);
    this.initialJumpSpeed = Math.abs(this.vel.x);
    this.vel.y = this.getJumpImpulse(this.initialJumpSpeed);
    this.vSquishVel = Constants.maxSquishVel;
  }

  applyFriction(): void {
    this.vel.x *= Constants.friction;
  }

  applyBearingFriction(): void {
    this.bearing *= Constants.bearingFriction;
  }

  left(): number {
    return this.pos.x - this.sideLength / 2;
  }

  right(): number {
    return this.pos.x + this.sideLength / 2;
  }

  // Y value of surface top or -1 for not landing.
  getContactHeight(): number {
    if (this.pos.y >= height) {
      return height;
    }
    // can't land if we're moving up
    if (this.vel.y < 0) {
      return -1;
    }
    const margin = this.platformMargin(this.vel.x);
    for (const plat of World.platforms) {
      if (this.pos.y >= plat.top &&
          this.pos.y <= plat.bottom &&
          this.right() >= plat.left + margin &&
          this.left() <= plat.right - margin) {
        return plat.top;
      }
    }
    return -1;
  }

  move(dt: number): void {
    this.yAccel(this.getGravity() * dt);
    if (this.isInContactWithGround()) {
      if (World.controller.jump && World.isJumpIdle()) {
        this.jump();
      } else if (!World.controller.jump && World.isJumpLanded()) {
        World.setJumpState(World.JumpState.idle);
      }
    }

    if (this.blinkCumulativeTime !== -1) {
      this.blinkCumulativeTime += dt;
    }
    if (this.blinkCumulativeTime >= Constants.blinkCycleSeconds) {
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
      const margin = this.platformMargin(this.vel.x);
      for (const plat of World.platforms) {
        if (currentY <= plat.top && this.pos.y >= plat.top &&
            this.right() >= plat.left + margin &&
            this.left() <= plat.right - margin) {
          colliding = true;
          this.pos.y = plat.top;
          break;
        }
      }
    }
    const oldvel = this.vel.y;
    if (colliding) {
      this.vel.y = 0;
      this.tumbleAnimation = null;
    }
    if (World.isJumpJumping()) {
      if (colliding) {
        this.eyeCenteringAnimation = new TimeBasedAnimation(this.eyeCentering,
            0, Constants.eyeCenteringDurationSeconds);
        // blink on hard landing
        if (oldvel > Constants.terminalVelocity * 0.95) {
          this.blink();
        }
        this.vSquishVel = -oldvel / 5.0;
        World.setJumpState(
            World.controller.jump ? World.JumpState.landed
                : World.JumpState.idle);
      }
    } else if (!colliding) {
      World.setJumpState(World.JumpState.jumping);  // we fell off a platform
      // Squish, but, if already squishing, squish in that direction.
      if (Constants.maxSquishVel > Math.abs(this.vSquishVel)) {
        this.vSquishVel = Constants.maxSquishVel * Math.sign(this.vSquishVel);
      }
      let sign = Math.sign(this.vel.x);
      if (World.controller.left) {
        sign = -1;
      } else if (World.controller.right) {
        sign = 1;
      }
      this.tumbleAnimation = new TumbleAnimation(sign, this.pos.y);
      this.eyeCenteringAnimation = new TimeBasedAnimation(this.eyeCentering,
          1, Constants.eyeCenteringDurationSeconds);
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
          this.vSquishVel, -Constants.maxSquishVel, Constants.maxSquishVel);
      this.vSquish += this.vSquishVel * dt;
    }

    if (this.eyeCenteringAnimation != null) {
      this.eyeCentering = this.eyeCenteringAnimation.value();
      if (this.eyeCenteringAnimation.isDone()) {
        this.eyeCenteringAnimation = null;
      }
    }
  }

  isInContactWithGround(): boolean {
    return this.getContactHeight() !== -1;
  }
}
