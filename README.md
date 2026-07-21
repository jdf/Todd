# Todd

A small étude in character animation and physics-ish game mechanics: an
orange square with an expressive eye who runs, jumps, squishes, tumbles,
and blinks. TypeScript + raw Canvas2D, zero runtime dependencies.

**[Play it](https://mrfeinberg.com/Todd/)** — arrows to move, spacebar to
jump (hold for height).

## Dev loop

```sh
npm run dev    # vite dev server with hot reload
npm test       # typecheck, build, headless 300-frame smoke test
./deploy       # test-gated deploy to mrfeinberg.com/Todd/
```

## The feel

All the character lives in `src/constants.ts` and `src/Todd.ts`:
variable-height jumping, speed-dependent jump impulse, platform edges
that get more forgiving the faster you move, squish as a real
spring-damper system, tumbles quantized to quarter turns so Todd always
lands flat, and an eye with its own bearing and friction.
