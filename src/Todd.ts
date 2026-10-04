import * as Constants from './constants.ts';
import {type World} from './world.ts';
import {
  clamp,
  lerp,
  lerpVec,
  TimeBasedAnimation,
  type Vec
} from './util.ts';

export enum JumpState {
  idle = 'idle',
  jumping = 'jumping',
  landed = 'landed',
}

class TumbleAnimation {
  startAngle = 0;
  targetHeight: number;

  constructor(
      readonly sign: number,
      private startHeight: number,
      private readonly tumbleLevels: readonly number[]) {
    this.targetHeight = this.nextTumbleHeight(startHeight);
  }

  nextTumbleHeight(height: number): number {
    for (const h of this.tumbleLevels) {
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

  // Defect in vertical size, units.
  // Horizontal gets inverse.
  vSquish = 0;
  // per second
  vSquishVel = 0;

  blinkCumulativeTime = -1;

  jumpState = JumpState.idle;

  // A quantity >= 0 when jumpState is jumping.
  // Used in calculating gravity during jump.
  initialJumpSpeed = -1;

  // Tumbling!
  tumbleAnimation: TumbleAnimation | null = null;
  // During tumbling, this animates to 1, which means completely centered.
  // When tumbling ends, this animates to 0, which means "where it wants to be".
  eyeCentering = 0;
  eyeCenteringAnimation: TimeBasedAnimation | null = null;

  constructor(
      readonly world: World,
      readonly sideLength: number,
      readonly fillColor: string) {
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
    return [4 / 15, 0, -1 / 6][this.speedStepFunction(xVel)];
  }

  getJumpImpulse(speed: number): number {
    return Constants.jumpImpulse * [1.0, 1.0, 1.2][this.speedStepFunction(
        speed)];
  }

  getGravity(): number {
    if (this.vel.y < 0) {
      // going up!
      return Constants.gravity * (this.world.controller.jump ? 0.55 : 1.0);
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

  drawAt(ctx: CanvasRenderingContext2D, x: number, y: number): void {
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
    ctx.roundRect(-bodyW / 2, bodyCenterY - bodyH / 2, bodyW, bodyH, 0.1);
    ctx.fill();

    const eyeVCenter = -s + 4 / 15 - this.vSquish;
    const eyeOffset = lerp(0, half - 0.2,
        Math.abs(this.bearing / Constants.maxvel));
    const pupilOffset = lerp(0, half - 0.1,
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
    ctx.ellipse(eyePos.x, eyePos.y, 1 / 6, 1 / 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(pupilPos.x, pupilPos.y, 0.05, 0.05, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.blinkCumulativeTime !== -1) {
      const blinkCycle = this.blinkCumulativeTime / Constants.blinkCycleSeconds;
      const lidTopY = eyePos.y - 0.2;
      const lidHeight = 0.4 * Math.sin(Math.PI * blinkCycle);
      ctx.fillStyle = this.fillColor;
      ctx.fillRect(-half + 0.1, lidTopY, s - 0.2, lidHeight);
    }
    ctx.restore();
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawAt(ctx, this.pos.x, this.pos.y);
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
    const term = this.world.controller.jump ? Constants.jumpTerminalVelocity
        : Constants.terminalVelocity;
    if (this.vel.y > term) {
      this.vel.y = term;
    }
  }

  jump(): void {
    this.jumpState = JumpState.jumping;
    this.initialJumpSpeed = Math.abs(this.vel.x);
    this.vel.y = this.getJumpImpulse(this.initialJumpSpeed);
    this.vSquishVel = Constants.maxSquishVel;
  }

  applyFriction(dt: number): void {
    this.vel.x *= Math.exp(-Constants.frictionRate * dt);
  }

  applyBearingFriction(dt: number): void {
    this.bearing *= Math.exp(-Constants.bearingFrictionRate * dt);
  }

  /** Rolls for a spontaneous blink over an interval of dt seconds. */
  maybeBlink(dt: number): void {
    if (Math.random() < 1 - Math.exp(-Constants.blinkRate * dt)) {
      this.blink();
    }
  }

  left(): number {
    return this.pos.x - this.sideLength / 2;
  }

  right(): number {
    return this.pos.x + this.sideLength / 2;
  }

  // Y value of surface top or -1 for not landing.
  getContactHeight(): number {
    const {floorY, platforms} = this.world;
    if (this.pos.y >= floorY) {
      return floorY;
    }
    // can't land if we're moving up
    if (this.vel.y < 0) {
      return -1;
    }
    const margin = this.platformMargin(this.vel.x);
    for (const plat of platforms) {
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
    const {controller, width, floorY, wallThickness} = this.world;

    this.yAccel(this.getGravity() * dt);
    if (this.isInContactWithGround()) {
      if (controller.jump && this.jumpState === JumpState.idle) {
        this.jump();
      } else if (!controller.jump && this.jumpState === JumpState.landed) {
        this.jumpState = JumpState.idle;
      }
    }

    if (this.blinkCumulativeTime !== -1) {
      this.blinkCumulativeTime += dt;
    }
    if (this.blinkCumulativeTime >= Constants.blinkCycleSeconds) {
      this.blinkCumulativeTime = -1;
    }

    // Walls: stop dead against them.
    this.pos.x += this.vel.x * dt;
    const minX = wallThickness + this.sideLength / 2;
    const maxX = width - wallThickness - this.sideLength / 2;
    if (this.pos.x < minX) {
      this.pos.x = minX;
      this.vel.x = Math.max(0, this.vel.x);
    } else if (this.pos.x > maxX) {
      this.pos.x = maxX;
      this.vel.x = Math.min(0, this.vel.x);
    }

    // Collisions.
    const currentY = this.pos.y;
    this.pos.y = currentY + this.vel.y * dt;
    let colliding = false;
    if (this.pos.y >= floorY) {
      colliding = true;
      this.pos.y = floorY;
    } else {
      const margin = this.platformMargin(this.vel.x);
      for (const plat of this.world.platforms) {
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
    if (this.jumpState === JumpState.jumping) {
      if (colliding) {
        this.eyeCenteringAnimation = new TimeBasedAnimation(this.eyeCentering,
            0, Constants.eyeCenteringDurationSeconds);
        // blink on hard landing
        if (oldvel > Constants.terminalVelocity * 0.95) {
          this.blink();
        }
        this.vSquishVel = -oldvel / 5.0;
        this.jumpState =
            controller.jump ? JumpState.landed : JumpState.idle;
      }
    } else if (!colliding) {
      this.jumpState = JumpState.jumping;  // we fell off a platform
      // Squish, but, if already squishing, squish in that direction.
      if (Constants.maxSquishVel > Math.abs(this.vSquishVel)) {
        this.vSquishVel = Constants.maxSquishVel * Math.sign(this.vSquishVel);
      }
      let sign = Math.sign(this.vel.x);
      if (controller.left) {
        sign = -1;
      } else if (controller.right) {
        sign = 1;
      }
      this.tumbleAnimation =
          new TumbleAnimation(sign, this.pos.y, this.world.tumbleLevels);
      this.eyeCenteringAnimation = new TimeBasedAnimation(this.eyeCentering,
          1, Constants.eyeCenteringDurationSeconds);
    }

    if (Math.abs(this.vSquishVel + this.vSquish) < 1 / 150) {
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
