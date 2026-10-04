// bg color
export const bg = '#000';

// The logical view, in world pixels. The canvas is scaled to fit the
// window at this aspect ratio, letterboxed; every other number in this
// file is tuned against these dimensions.
export const viewWidth = 600;
export const viewHeight = 300;

// The camera's character box, in view pixels. Todd moves freely inside
// it; when his bottom-center crosses an edge, the camera is pushed along
// with him. The box is tall enough that a full running jump from the
// bottom edge stays inside it, so jumping alone never moves the camera.
export const cameraBox = {left: 230, top: 90, right: 370, bottom: 230};

// length of dude's side
export const side = 30;

// Decay rates, in 1/s: each second the quantity is multiplied by
// e^-rate, so the rate is independent of frame rate. Both were per-frame
// multipliers (0.83 and 0.8 at 60Hz) and are written as the equivalent
// rates so the feel is exactly preserved at 60Hz.
//
// Ground friction on velocity when not accelerating: 11.2/s, a
// half-life of 62ms.
export const frictionRate = -Math.log(0.83) * 60;
// Bearing (eye direction) when not accelerating: 13.4/s, a half-life
// of 52ms.
export const bearingFrictionRate = -Math.log(0.8) * 60;

// The following constants are pixels per second.
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

// Blinking: a Poisson rate in blinks per second, so on average one
// blink every five seconds (it was a 1/300 roll per frame at 60Hz).
export const blinkRate = 0.2;
export const blinkCycleSeconds = 0.25;

// Eye centering speed for tumbling/landing.
export const eyeCenteringDurationSeconds = 0.25;

// KeyboardEvent.code values.
export const controllerKeys = {
  jump: 'Space',
  left: 'ArrowLeft',
  right: 'ArrowRight',
} as const;

// Non-controller keys.
export const fullscreenKey = 'KeyF';
export const debugKey = 'KeyB';
