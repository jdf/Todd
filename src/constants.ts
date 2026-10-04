// Every tuned feel number lives here. Changing one changes how the
// game feels; treat this file as design.
//
// Units: the world unit is Todd. His side is 1, the view is 20 x 10,
// time is in seconds, so speeds are in Todds per second. The runtime
// derives pixels per unit from the window; nothing here knows about
// pixels. (Before the conversion a unit was 30 logical pixels of a
// 600 x 300 view; the values below are exactly the old ones over 30.)

// bg color
export const bg = '#000';

// The logical view, in units. The canvas is scaled to fit the window
// at this aspect ratio, letterboxed.
export const viewWidth = 20;
export const viewHeight = 10;

// The camera's character box, in view units. Todd moves freely inside
// it; when his bottom-center crosses an edge, the camera is pushed
// along with him. The box is tall enough that a full running jump from
// the bottom edge stays inside it, so jumping alone never moves the
// camera.
export const cameraBox = {left: 7.5, top: 3, right: 12.5, bottom: 7.5};

// length of dude's side: the unit.
export const side = 1;

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

// Accelerations in units/s^2, speeds in units/s.
export const gravity = 140 / 3;          // 46.67
export const maxvel = 8;
export const accel = 30;
export const airBending = 115 / 6;       // 19.17
export const bearingAccel = 40;
export const jumpImpulse = -35 / 3;      // -11.67: 2.7 high held, 3.8 running

export const maxSquishVel = 8 / 3;       // 2.67

// Max vertical velocity while holding down jump.
export const jumpTerminalVelocity = 35 / 3;  // 11.67
export const terminalVelocity = 55 / 3;      // 18.33

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
