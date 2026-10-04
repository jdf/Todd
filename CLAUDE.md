# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## What this is

A character-animation / game-feel étude by Jonathan Feinberg: Todd is an
orange square with one eye who runs, jumps, squishes, tumbles, and blinks.
TypeScript + Vite + raw Canvas2D, zero runtime dependencies (p5.js was
deliberately removed — don't reintroduce libraries). Live at
https://mrfeinberg.com/Todd/ via `./deploy`: the dist is staged into the
~/mrfeinberg.com site repo at `Todd/`, committed there ("Todd build
<gitrev>"), then rsynced with --delete scoped to that subtree — the site
repo is the versioned deploy artifact.

## Commands

```sh
npm run dev      # vite dev server, hot reload
npm run check    # tsc --noEmit (strict; covers src/ and tests/)
npm test         # check + vite build + tests/smoke.ts against dist/
./deploy         # npm test, stage, commit site repo, rsync to host
./deploy -n      # build/test + stage only, rsync dry run
```

## Architecture

- `src/runtime.ts` — the only canvas-aware module: fits the fixed
  600×300 logical view to the window (letterboxed, DPR-scaled, refit on
  resize), `width`/`height` of that view, `millis()`, fullscreen toggle.
- `src/camera.ts` — push-box camera: the target roams inside a box of
  view coordinates (`cameraBox` in constants) without moving the view;
  crossing an edge drags the camera; the view is clamped to the world.
- `src/world.ts` — instantiable `World`: width, `floorY`, walls and
  ground depth, sorted platforms, derived `tumbleLevels`, controller
  state, terrain drawing. No module-level game state anywhere.
- `src/level.ts` — the one level: 1800×760, platforms in 90px rises.
- `src/Todd.ts` — the character: physics, `JumpState` machine, and all
  drawing. Takes a `World`; `draw(ctx)` takes the context, so sim code
  never imports the runtime and can run headless.
- `src/constants.ts` — every tuned feel number, with units in comments.
  Changes here change how the game *feels*; treat as design, not code.
- `src/main.ts` — input wiring and the rAF loop: sim, then camera
  follow, then draw world space under a camera translate and HUD in
  view space. dt comes from the rAF timestamp and is clamped to 50ms:
  an occluded window freezes rAF, and integrating a multi-second dt
  makes the squish spring diverge. `window.toddDebug` exposes world,
  camera, and Todd for the smoke test and console poking; `b` toggles
  a debug overlay showing the camera box.

## Conventions

- Sibling imports use explicit `.ts` extensions
  (`allowImportingTsExtensions`).
- Physics is bespoke and tuned; refactors must be behavior-preserving.
  `npm test` runs a 900-frame headless smoke test against the *built
  bundle* (the artifact that ships) — keep it passing, and extend it
  when adding behaviors.
- Checking in a browser: a backgrounded or occluded Chrome tab pauses
  rAF, so the sim does not advance. Bring the tab forward first.
- jj colocated with git; bookmark is `main`, pushed to
  github.com/jdf/Todd.
