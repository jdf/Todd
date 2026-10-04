// Drive the game in headless Chrome over the DevTools protocol, with no
// dependencies beyond Node's built-in WebSocket and the Chrome on this
// machine. Headless Chrome runs requestAnimationFrame at full rate and
// never takes focus, so this is how to look at the game, take
// screenshots, and poke at the sim without touching the user's browser.
//
//   node tools/headless.ts <scenario.ts> [--url http://...] [--out dir]
//
// The scenario module's default export is `async (page: Page) => void`.
// Without --url, a vite dev server is started on port 5179 and stopped
// afterwards. Screenshots go to --out (default: the scenario's
// directory). Example scenario:
//
//   export default async (page) => {
//     await page.key('ArrowRight', true);
//     await page.wait(800);
//     await page.shot('running.png');
//     console.log(await page.eval('window.toddDebug.todd.lean'));
//   };
import {spawn, type ChildProcess} from 'node:child_process';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const chromePath =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const windowSize = {width: 1200, height: 600};

export interface Page {
  /** Evaluates an expression in the page; promises are awaited. */
  eval<T = unknown>(expression: string): Promise<T>;
  /** Presses or releases a key by KeyboardEvent.code, as real input. */
  key(code: string, down: boolean): Promise<void>;
  /** Holds a key for ms milliseconds. */
  tap(code: string, ms?: number): Promise<void>;
  wait(ms: number): Promise<void>;
  /** PNG screenshot of the viewport, written under the out dir. */
  shot(name: string): Promise<string>;
  /**
   * Pauses the game's own loop (once) and advances exactly n frames at
   * 60Hz, independent of headless Chrome's frame pacing. Timing-sensitive
   * checks should use this rather than wait().
   */
  step(n?: number): Promise<void>;
}

interface Args {
  scenario: string;
  url?: string;
  out?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') {
      args.url = argv[++i];
    } else if (a === '--out') {
      args.out = argv[++i];
    } else if (!args.scenario) {
      args.scenario = a;
    } else {
      throw new Error(`unexpected argument ${a}`);
    }
  }
  if (!args.scenario) {
    throw new Error('usage: node tools/headless.ts <scenario.ts> [--url url] [--out dir]');
  }
  return args as Args;
}

function waitForLine(proc: ChildProcess, re: RegExp, what: string): Promise<RegExpMatchArray> {
  return new Promise((res, rej) => {
    let buf = '';
    const onData = (chunk: Buffer) => {
      buf += chunk.toString();
      const m = buf.match(re);
      if (m) {
        res(m);
      }
    };
    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);
    proc.on('exit', (code) => rej(new Error(`${what} exited (${code}) before it was ready:\n${buf}`)));
    setTimeout(() => rej(new Error(`${what} not ready after 15s:\n${buf}`)), 15000);
  });
}

async function startVite(port: number): Promise<ChildProcess> {
  const vite = spawn('npx', ['vite', '--port', String(port), '--strictPort'],
      {cwd: resolve(dirname(new URL(import.meta.url).pathname), '..'),
       stdio: ['ignore', 'pipe', 'pipe']});
  await waitForLine(vite, /Local:\s+http/, 'vite');
  return vite;
}

// A minimal CDP client over the browser websocket with flattened
// sessions.
class Cdp {
  private nextId = 1;
  private pending = new Map<number, {res: (v: unknown) => void; rej: (e: Error) => void}>();
  private listeners: Array<(method: string, params: unknown, sessionId?: string) => void> = [];

  private readonly ws: WebSocket;

  private constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (!p) {
          return;
        }
        if (msg.error) {
          p.rej(new Error(`${msg.error.message} (${msg.error.code})`));
        } else {
          p.res(msg.result);
        }
      } else {
        for (const l of this.listeners) {
          l(msg.method, msg.params, msg.sessionId);
        }
      }
    });
  }

  static connect(url: string): Promise<Cdp> {
    return new Promise((res, rej) => {
      const ws = new WebSocket(url);
      ws.addEventListener('open', () => res(new Cdp(ws)));
      ws.addEventListener('error', () => rej(new Error(`cannot connect to ${url}`)));
    });
  }

  send<T = unknown>(method: string, params: object = {}, sessionId?: string): Promise<T> {
    const id = this.nextId++;
    this.ws.send(JSON.stringify({id, method, params, sessionId}));
    return new Promise((res, rej) => {
      this.pending.set(id, {res: res as (v: unknown) => void, rej});
    });
  }

  on(method: string, fn: (params: unknown, sessionId?: string) => void): void {
    this.listeners.push((m, params, sid) => {
      if (m === method) {
        fn(params, sid);
      }
    });
  }

  once(method: string, sessionId?: string): Promise<unknown> {
    return new Promise((res) => {
      const l = (m: string, params: unknown, sid?: string) => {
        if (m === method && (sessionId === undefined || sid === sessionId)) {
          this.listeners = this.listeners.filter((x) => x !== l);
          res(params);
        }
      };
      this.listeners.push(l);
    });
  }

  close(): void {
    this.ws.close();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const scenarioPath = resolve(args.scenario);
  const outDir = resolve(args.out ?? dirname(scenarioPath));
  const scenario = (await import(pathToFileURL(scenarioPath).href)).default as (p: Page) => Promise<void>;

  let vite: ChildProcess | null = null;
  let url = args.url;
  if (!url) {
    const port = 5179;
    vite = await startVite(port);
    url = `http://localhost:${port}/`;
  }

  const profile = mkdtempSync(join(tmpdir(), 'todd-headless-'));
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `--window-size=${windowSize.width},${windowSize.height}`,
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ], {stdio: ['ignore', 'pipe', 'pipe']});

  let cdp: Cdp | null = null;
  try {
    const m = await waitForLine(chrome, /DevTools listening on (ws:\/\/\S+)/, 'chrome');
    cdp = await Cdp.connect(m[1]);
    const {targetId} = await cdp.send<{targetId: string}>('Target.createTarget', {url: 'about:blank'});
    const {sessionId} = await cdp.send<{sessionId: string}>('Target.attachToTarget', {targetId, flatten: true});
    const s = sessionId;
    await cdp.send('Page.enable', {}, s);
    await cdp.send('Runtime.enable', {}, s);
    const loaded = cdp.once('Page.loadEventFired', s);
    await cdp.send('Page.navigate', {url}, s);
    await loaded;

    // Headless Chrome paces requestAnimationFrame at ~10Hz when nothing
    // consumes frames. A screencast, with every frame acknowledged,
    // makes it render at full rate.
    cdp.on('Page.screencastFrame', (params, sid) => {
      void cdp!.send('Page.screencastFrameAck',
          {sessionId: (params as {sessionId: number}).sessionId}, sid);
    });
    await cdp.send('Page.startScreencast',
        {format: 'jpeg', quality: 10, everyNthFrame: 1}, s);

    const c = cdp;
    const page: Page = {
      async eval<T>(expression: string): Promise<T> {
        const r = await c.send<{result: {value: T}; exceptionDetails?: {text: string; exception?: {description?: string}}}>(
            'Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true}, s);
        if (r.exceptionDetails) {
          throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
        }
        return r.result.value;
      },
      async key(code, down) {
        await c.send('Input.dispatchKeyEvent', {
          type: down ? 'keyDown' : 'keyUp',
          code,
          key: keyFor(code),
          windowsVirtualKeyCode: vkFor(code),
        }, s);
      },
      async tap(code, ms = 40) {
        await page.key(code, true);
        await page.wait(ms);
        await page.key(code, false);
      },
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
      async step(n = 1) {
        await page.eval(`toddDebug.pause(); toddDebug.step(${n})`);
      },
      async shot(name) {
        const {data} = await c.send<{data: string}>('Page.captureScreenshot', {format: 'png'}, s);
        const path = join(outDir, name);
        writeFileSync(path, Buffer.from(data, 'base64'));
        return path;
      },
    };

    await scenario(page);
  } finally {
    cdp?.close();
    vite?.kill();
    const exited = new Promise<void>((r) => chrome.on('exit', () => r()));
    chrome.kill();
    await exited;
    // Renderer processes outlive the browser briefly and may still be
    // writing to the profile.
    for (let i = 0; i < 20; i++) {
      try {
        rmSync(profile, {recursive: true, force: true});
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }
}

function keyFor(code: string): string {
  if (code === 'Space') return ' ';
  if (code.startsWith('Key')) return code.slice(3).toLowerCase();
  return code;  // ArrowLeft etc. share the name
}

function vkFor(code: string): number {
  const table: Record<string, number> = {
    Space: 32, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
  };
  if (code in table) return table[code];
  if (code.startsWith('Key')) return code.charCodeAt(3);
  return 0;
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
