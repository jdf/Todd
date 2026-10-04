// Headless test for the built bundle: stub just enough DOM and canvas
// for the game to boot, then drive it at exactly 60Hz with a fake
// clock and a seeded random, so a run is deterministic. A scripted
// controller runs, jumps with early release, lands on platforms,
// tumbles off them, and finally runs into a wall; the test fails on
// any exception, checks the canvas fit, the walls, and the camera, and
// compares Todd's trajectory against tests/golden.json.
//
// The golden trajectory is the feel. A refactor that is meant to be
// behavior-preserving must leave it untouched; a deliberate feel change
// regenerates it with UPDATE_GOLDEN=1 npm test, and the diff in the
// golden file is part of the review.
//
// Run via `npm test` (which builds first): the test exercises dist/,
// the exact artifact that deploys.
import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

// Fake clock: performance.now() advances only when a frame is run.
const frameMillis = 1000 / 60;
let now = 1000;
performance.now = () => now;

// Seeded random (mulberry32) so blinks are reproducible.
let seed = 0x5eed;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

let ctxCalls = 0;
const canvasStub = {
  width: 0,
  height: 0,
  style: {} as Record<string, string>,
  getContext: () => ctxStub,
};
const ctxStub: unknown = new Proxy({}, {
  get: (_t, prop) =>
      prop === 'canvas' ? canvasStub : () => { ctxCalls++; },
  set: () => true,
});

type Listener = (e: unknown) => void;
const listeners = new Map<string, Listener[]>();

const windowStub = {
  // 2:1, same as the view: the canvas fills it at scale 2.
  innerWidth: 1200,
  innerHeight: 600,
  devicePixelRatio: 2,
  addEventListener: (type: string, fn: Listener) => {
    let fns = listeners.get(type);
    if (!fns) {
      listeners.set(type, fns = []);
    }
    fns.push(fn);
  },
};

(globalThis as Record<string, unknown>).window = windowStub;

(globalThis as Record<string, unknown>).document = {
  // Satisfies vite's modulepreload polyfill, which bails out early
  // when relList.supports('modulepreload') is true.
  createElement: () => ({relList: {supports: () => true}}),
  getElementById: (id: string) => {
    if (id !== 'todd') {
      throw new Error(`unexpected element id ${id}`);
    }
    return canvasStub;
  },
};

let rafCallback: FrameRequestCallback | null = null;
(globalThis as Record<string, unknown>).requestAnimationFrame =
    (fn: FrameRequestCallback) => { rafCallback = fn; };

const distAssets = join(dirname(fileURLToPath(import.meta.url)),
    '..', 'dist', 'assets');
const bundle = readdirSync(distAssets).find(f => f.endsWith('.js'));
if (!bundle) {
  throw new Error(`no bundle in ${distAssets}; run the build first`);
}
await import(join(distAssets, bundle));

function fire(type: string, e: unknown): void {
  for (const fn of listeners.get(type) ?? []) {
    fn(e);
  }
}

function fireKey(type: string, code: string): void {
  fire(type, {code, repeat: false, preventDefault() {}});
}

function expectCanvas(w: number, h: number, cssW: string, cssH: string): void {
  if (canvasStub.width !== w || canvasStub.height !== h ||
      canvasStub.style.width !== cssW || canvasStub.style.height !== cssH) {
    throw new Error(`bad canvas fit: backing ${canvasStub.width}x${
        canvasStub.height}, css ${canvasStub.style.width} x ${
        canvasStub.style.height}`);
  }
}

// Letterboxing: a 2:1 window is filled; a square one gets bars.
expectCanvas(2400, 1200, '1200px', '600px');
windowStub.innerWidth = 900;
windowStub.innerHeight = 900;
fire('resize', {});
expectCanvas(1800, 900, '900px', '450px');

interface Debug {
  world: {width: number; floorY: number; height: number; wallThickness: number};
  camera: {x: number; y: number};
  todd: {pos: {x: number; y: number}; sideLength: number};
}
const {world, camera, todd} = (windowStub as {toddDebug?: Debug}).toddDebug!;
if (camera.x !== 600 || camera.y !== world.height - 300) {
  throw new Error(`bad opening camera ${camera.x}, ${camera.y}`);
}

// The script: frame -> keys to press (lowercase) or release (prefixed
// with -). Starting at the center of the floor, with the green platform
// (900..1100, top 630) just to the right and the blue one (700..850,
// top 530) up and to the left.
const script: Record<number, string[]> = {
  30: ['ArrowLeft'],               // back up a little
  60: ['-ArrowLeft', 'ArrowRight'],
  100: ['Space'],                  // running jump onto the green platform
  125: ['-Space'],
  140: ['-ArrowRight', 'ArrowLeft'],  // run left along it
  185: ['Space'],                  // and up onto the blue one
  210: ['-Space'],
  280: ['Space'],                  // tap jump after tumbling off its end
  282: ['-Space'],
  330: ['-ArrowLeft'],
  360: ['ArrowRight', 'Space'],    // running jump, held, early release
  380: ['-Space'],
  480: ['-ArrowRight', 'ArrowLeft'],
  540: ['Space'],
  542: ['-Space'],
  600: ['-ArrowLeft', 'ArrowRight'],  // run into the right wall
};

const trajectory: number[][] = [];
const contactHeights = new Set<number>();
let cameraMoved = false;
let frames = 0;

function frame(): void {
  for (const key of script[frames] ?? []) {
    if (key.startsWith('-')) {
      fireKey('keyup', key.slice(1));
    } else {
      fireKey('keydown', key);
    }
  }
  // The widening cast defeats tsc's narrowing: rafCallback is only
  // assigned inside the stub's closure, so flow analysis thinks it
  // stays null.
  const cb = rafCallback as FrameRequestCallback | null;
  if (!cb) {
    throw new Error(`no rAF scheduled at frame ${frames}`);
  }
  rafCallback = null;
  now += frameMillis;
  cb(now);
  frames++;
  if (frames % 5 === 0) {
    trajectory.push([frames, round(todd.pos.x), round(todd.pos.y)]);
  }
  contactHeights.add(todd.pos.y);
  if (camera.x > 600 && camera.x < 1200) {
    cameraMoved = true;
  }
}

function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

const totalFrames = 1200;
while (frames < totalFrames) {
  frame();
}

if (process.env.TRACE) {
  for (const [f, x, y] of trajectory) {
    console.log(f, x.toFixed(1), y.toFixed(1));
  }
}

if (ctxCalls < totalFrames) {
  throw new Error(`only ${ctxCalls} canvas calls in ${totalFrames} frames`);
}

// The script must have landed on both nearby platforms.
for (const top of [530, 630]) {
  if (!contactHeights.has(top)) {
    throw new Error(`never stood on the platform at ${top}`);
  }
}

// Walls and camera: the last 600 frames run 2400px to the right, far
// more than the distance to the wall.
const wallX = world.width - world.wallThickness - todd.sideLength / 2;
if (todd.pos.x !== wallX || todd.pos.y !== world.floorY) {
  throw new Error(`todd at ${todd.pos.x}, ${todd.pos.y}; wanted ${
      wallX}, ${world.floorY}`);
}
if (!cameraMoved || camera.x !== world.width - 600) {
  throw new Error(`camera at ${camera.x}, moved=${cameraMoved}`);
}

// Trajectory against the golden.
const goldenPath = join(dirname(fileURLToPath(import.meta.url)), 'golden.json');
if (process.env.UPDATE_GOLDEN) {
  writeFileSync(goldenPath, JSON.stringify(trajectory) + '\n');
  console.log(`smoke: wrote ${trajectory.length} samples to ${goldenPath}`);
} else {
  const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as number[][];
  if (golden.length !== trajectory.length) {
    throw new Error(`golden has ${golden.length} samples, run has ${
        trajectory.length}`);
  }
  const tolerance = 1e-6;
  for (let i = 0; i < golden.length; i++) {
    const [gf, gx, gy] = golden[i];
    const [f, x, y] = trajectory[i];
    if (gf !== f || Math.abs(gx - x) > tolerance || Math.abs(gy - y) > tolerance) {
      throw new Error(`trajectory diverges from golden at frame ${f}: ` +
          `got ${x}, ${y}; golden ${gx}, ${gy}. ` +
          `If the feel change is intended, UPDATE_GOLDEN=1 npm test.`);
    }
  }
}

console.log(`smoke: ${bundle}, ${ctxCalls} canvas calls, ${frames} frames, OK`);
