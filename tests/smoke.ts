// Headless smoke test for the built bundle: stub just enough DOM and
// canvas for the game to boot, then run it for 300 frames while
// mashing the controller — running, jumping with early release,
// reversing off platforms — and fail on any exception.
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

(globalThis as Record<string, unknown>).window = {
  devicePixelRatio: 2,
  addEventListener: (type: string, fn: Listener) => {
    let fns = listeners.get(type);
    if (!fns) {
      listeners.set(type, fns = []);
    }
    fns.push(fn);
  },
};

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

if (canvasStub.width !== 1200) {
  throw new Error(`bad canvas backing width ${canvasStub.width}`);
}

function fireKey(type: string, code: string): void {
  for (const fn of listeners.get(type) ?? []) {
    fn({code, repeat: false, preventDefault() {}});
  }
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

if (ctxCalls < 300) {
  throw new Error(`only ${ctxCalls} canvas calls in 300 frames`);
}
console.log(`smoke: ${bundle}, ${ctxCalls} canvas calls, 300 frames, OK`);
