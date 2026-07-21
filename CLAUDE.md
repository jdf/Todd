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

- `src/runtime.ts` — the only canvas-aware module: DPR-scaled context,
  `width`/`height`, `millis()`.
- `src/world.ts` — instantiable `World`: dimensions, sorted platforms,
  derived `tumbleLevels`, controller state. No module-level game state
  anywhere.
- `src/Todd.ts` — the character: physics, `JumpState` machine, and all
  drawing. Takes a `World`; `draw(ctx)` takes the context, so sim code
  never imports the runtime and can run headless.
- `src/constants.ts` — every tuned feel number, with units in comments.
  Changes here change how the game *feels*; treat as design, not code.
- `src/main.ts` — canvas + input wiring and the rAF loop. dt comes from
  the rAF timestamp and is clamped to 50ms: an occluded window freezes
  rAF, and integrating a multi-second dt makes the squish spring diverge.

## Conventions

- Sibling imports use explicit `.ts` extensions
  (`allowImportingTsExtensions`).
- Physics is bespoke and tuned; refactors must be behavior-preserving.
  `npm test` runs a 300-frame headless smoke test against the *built
  bundle* (the artifact that ships) — keep it passing, and extend it
  when adding behaviors.
- jj colocated with git; bookmark is `main`, pushed to
  github.com/jdf/Todd.
