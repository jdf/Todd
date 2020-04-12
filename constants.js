import p from './runtime.js';

// bg color
export const bg = 0;

// length of dude's side
export const side = 30;

// A unitless export constant that we apply to velocity while on the ground.
export const friction = 0.83;

// A unitless export constant that we apply to bearing when not accelerating.
export const bearingFriction = 0.8;

// The following export constants are pixels per second.
export const gravity = 1400.0;
export const maxvel = 240.0;
export const accel = 900.0;
export const airBending = 575.0;
export const bearingAccel = 1200.0;
export const jumpImpulse = -350.0;

export const maxSquishVel = 80.0;

// Max vertical velocity while holding down jump.
export const jumpTerminalVelocity = 350.0;
export const terminalVelocity = 550.0;

// Blinking.
export const blinkOdds = 1 / 300.0;
export const blinkCycleSeconds = 0.25;

// Eye centering speed for tumbling/landing.
export const eyeCenteringDurationSeconds = 0.25;

export const controllerKeyCodes = {
  jump: 32, // space
  left: p.LEFT_ARROW,
  right: p.RIGHT_ARROW,
};
