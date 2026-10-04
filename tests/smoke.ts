// Headless smoke test for the built bundle: stub just enough DOM and
// canvas for the game to boot, then run it for 300 frames while
// mashing the controller — running, jumping with early release,
// reversing off platforms — and fail on any exception. A second phase
// runs Todd into the right wall and checks that the walls stop him and
// the camera follows him and then stops at the world's edge.
//
// Run via `npm test` (which builds first): the test exercises dist/,
// the exact artifact that deploys.
import {readdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

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

async function frame(i: number): Promise<void> {
  await new Promise(r => setTimeout(r, 8));
  // The widening cast defeats tsc's narrowing: rafCallback is only
  // assigned inside the stub's closure, so flow analysis thinks it
  // stays null.
  const cb = rafCallback as FrameRequestCallback | null;
  if (!cb) {
    throw new Error(`no rAF scheduled at frame ${i}`);
  }
  rafCallback = null;
  cb(performance.now());
}

for (let i = 0; i < 300; i++) {
  if (i === 30) fireKey('keydown', 'ArrowRight');
  if (i === 90) fireKey('keydown', 'Space');
  if (i === 120) fireKey('keyup', 'Space');
  if (i === 150) {
    fireKey('keyup', 'ArrowRight');
    fireKey('keydown', 'ArrowLeft');
  }
  if (i === 240) {
    fireKey('keyup', 'ArrowLeft');
    fireKey('keydown', 'Space');
    fireKey('keyup', 'Space');
  }
  await frame(i);
}

if (ctxCalls < 300) {
  throw new Error(`only ${ctxCalls} canvas calls in 300 frames`);
}

// Phase two: run right until the wall. At ~10ms a frame and 240px/s
// that is well over the 900px to the far wall, and the camera must
// pass through its following range on the way.
fireKey('keydown', 'ArrowRight');
let cameraMoved = false;
let frames = 300;
for (let i = 0; i < 600; i++, frames++) {
  await frame(frames);
  if (camera.x > 600 && camera.x < 1200) {
    cameraMoved = true;
  }
}
fireKey('keyup', 'ArrowRight');
const wallX = world.width - world.wallThickness - todd.sideLength / 2;
if (todd.pos.x !== wallX || todd.pos.y !== world.floorY) {
  throw new Error(`todd at ${todd.pos.x}, ${todd.pos.y}; wanted ${
      wallX}, ${world.floorY}`);
}
if (!cameraMoved || camera.x !== world.width - 600) {
  throw new Error(`camera at ${camera.x}, moved=${cameraMoved}`);
}
console.log(`smoke: ${bundle}, ${ctxCalls} canvas calls, ${frames} frames, OK`);
