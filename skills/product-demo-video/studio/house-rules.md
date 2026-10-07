# Product demo studio rules

## Render contract
- Every video is a pure function of time: `window.seek(t)` in `index.html` paints frame t.
- No CSS transitions, no setTimeout, no requestAnimationFrame in render mode, no state carried
  between frames. Seeded noise only (`rng(seed)` from `lib/motion.js`), never Math.random.
- All motion uses springs from `lib/motion.js`. Any value with more than one target uses `track()`.
- Layout reads `DW`, `DH`, `PORTRAIT`, `SQUARE` (design space: short side = 1080 units).
  Never hard-code pixels for one format.
- Wrap every `globalAlpha` in `clamp()`: springs overshoot, and canvas ignores values outside
  0..1 (the previous alpha stays, so faded elements pop back at full opacity).
- Scene exits and line swaps must multiply into element opacity (a scene-level factor), not
  set `globalAlpha` once; any element that sets its own alpha would otherwise ignore the exit.
- During a swap the outgoing text must be gone before the incoming text lands on the same spot.
- Render with `node render.mjs`. H.264 yuv420p, CRF 16, 60 fps. 4 subframes of motion blur for
  pure motion graphics; `--sub 1` when the camera moves over screenshots (blending ghosts small text).

## Product truth
- Use the real product: real screenshots, logo, colors, fonts, copy. Never invent screens or numbers.
- Assets live in `./assets` and are listed in `assets/README.md`.

## Look
- Banned: centered title on gradient, everything fading in, corner labels and frame borders,
  glow on UI chrome, generic particle bursts, bouncy easing on text.
- One display face, one UI face, one accent color unless the brief says otherwise.
- Hook in the first 2 seconds. Something new happens every 2 to 4 seconds. No dead beats.
- Text must read at 360 px wide. Never scale text with `will-change` or bitmap-scale it.

## Sound
- Music is `audio/music.wav` (synthesized with `music.mjs`) or a supplied track measured with `beats.py`.
- State changes land on `beats`, big moments on `downbeats`, SFX on `hits`. Final mix -14 LUFS.
- Voiceover (optional) is `audio/voice.wav` from `voiceover.mjs`; each shot starts on its line's
  start time in `vo_script.json`, and `mix.sh --voice` ducks the music under it.
- API keys live only in `.env` and are referred to by variable name.

## Loop before showing anything
1. Render stills (one per beat or shot) and a contact sheet. Open the images and LOOK at them.
2. Score 1-10: hook, readability at phone size, motion quality, variety, composition,
   brand accuracy, sound sync.
3. Fix the 3 worst problems, log them in `docs/review_log.md`. Repeat until every score is 8+.
4. Only then do the full render.
