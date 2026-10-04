# Todd

A small étude in character animation and physics-ish game mechanics: an
orange square with an expressive eye who runs, jumps, squishes, tumbles,
and blinks. TypeScript + raw Canvas2D, zero runtime dependencies.

**[Play it](https://mrfeinberg.com/Todd/)** — arrows to move, spacebar to
jump (hold for height), `f` for fullscreen.

## Dev loop

```sh
npm run dev    # vite dev server with hot reload
npm test       # typecheck, build, headless 900-frame smoke test
./deploy       # test-gated deploy to mrfeinberg.com/Todd/
```

## The feel

All the character lives in `src/constants.ts` and `src/Todd.ts`:
variable-height jumping, speed-dependent jump impulse, platform edges
that get more forgiving the faster you move, squish as a real
spring-damper system, tumbles quantized to quarter turns so Todd always
lands flat, and an eye with its own bearing and friction.

## The view

The game renders a fixed 600×300 logical view, scaled to fill the
window with letterbox bars. A push-box camera follows Todd through a
world three views wide and two and a half tall (`b` shows the box).
