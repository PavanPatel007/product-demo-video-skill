# Product demo studio rules

## Files
- This folder is the workspace; all work stays here. The user's folder (`root` in `.pdv.json`)
  receives only the final MP4s, named `<product>-<format>.mp4`. Never write anything else there.
- Keys come from `~/.config/product-demo-video/.env` or the user's folder `.env`; never copy
  them into this folder.

## Render contract
- Every video is a pure function of time: `window.seek(t)` in `index.html` paints frame t.
- No CSS transitions, no setTimeout, no requestAnimationFrame in render mode, no state carried
  between frames. Seeded noise only (`rng(seed)` from `lib/motion.js`), never Math.random.
- All motion uses springs from `lib/motion.js`. Any value with more than one target uses `track()`.
- Layout reads `DW`, `DH`, `PORTRAIT`, `SQUARE` (design space: short side = 1080 units).
  Never hard-code pixels for one format.
- Wrap every `globalAlpha` in `clamp()`: springs overshoot, and canvas ignores values outside
  0..1 (the previous alpha stays, so faded elements pop back at full opacity). The kit's
  `alpha()` does this and multiplies in the scene factor `SA`.
- Scenes receive absolute `t` and place events on the beat grid with `B(n)` (beat n).
- Counters, typed text and scrambles read frame time (`countUp`, `typeOn`, `scramble` do this via
  `frameLocal`), or they smear across motion-blur samples.
- Declare the canvas context with `let g` (layers swap it) and every variable before the first
  `seek()`. Keep `window.seek = seekWith(draw)` when the film uses footage.
- Render with `node render.mjs`. H.264 yuv420p, CRF 16, 60 fps, adaptive motion blur
  (`--sub auto`, 180° shutter): samples are spaced so nothing moves more than 3 px between them,
  still frames stay sharp. `node render.mjs --verify` must pass before a full render. List
  deliberate hard cuts in `window.CUTS` so blur never crosses them.

## Product truth
- Use the real product: real screenshots, logo, colors, fonts, copy. Never invent screens or numbers.
- Assets live in `./assets` and are listed in `assets/README.md`.
- UI may be rebuilt as vector cards (`card`, `chip`, `toggle`) only with real copy and real colors
  from the captures. `skeletonUI()` is a placeholder for the template; never ship it.
- Prefer vector UI (`domPage` from `capture-dom.mjs`, or tokens from `assets/code`) over screenshots
  for anything the camera pushes into; use a screenshot where `compare.png` shows red.
- The product's code (if the user allowed it) is read-only: never run, build, edit or commit there.

## Look (the Opus 5.5 grammar, see research.md in the skill)
- One continuous take. Every scene is made out of the previous one: mask rise, dot → pill,
  iris, flood/contract, morph box, collapse into the accent dot. Hard cuts only on a downbeat,
  and only for showreel-style briefs.
- Banned: crossfades, blur-ins, brightness "developing", 3D flips, particles, glows,
  centered title on gradient, corner labels and frame borders, bouncy easing on text,
  anything that looks like a template.
- Something changes on every beat. No hold over 1 s, except the end card (about 2.5 s).
- Camera: screen-studio zooms toward what the cursor touches; the cursor scales with the zoom.
  Product UI on a `plane3d` tilt that straightens as the camera pushes in; UI behind goes soft
  while the focus card stays sharp; UI bleeds off the frame edge.
- Camera moves with `camPath` (keyed `[time, zoom, x, y]`, zoom in log space): one glide per
  scene, never in-then-out back to back, never reversing mid-move, never into a tiny dot (open
  the dot with `iris` or `portal` instead).
- Anything that travels glides 0.8 s on cubic-bezier(.45,0,.15,1) (`glide`, `keyed`, `states`);
  springs are for pops and landings. Every handoff carries something across (shared element).
- Draw order is layer order: a flood is drawn after everything it covers. Floods clear the
  farthest corner in about 0.3-0.35 s. Typed text runs on fixed lines (`\n`), never wraps.
- Shadows grow with height (`card(..., {lift})`). Never crop type at the frame edge.
- Type: one heavy display face with tight tracking, one UI face, mono for numbers and kickers,
  one accent color, used for the period. Split layout in 16:9: headline left, live UI right.
- Text must read at 360 px wide. Never bitmap-scale text.
- Mascot (if any): fixed proportions and palette, squash/stretch on landings, seeded blinks,
  eyes follow the cursor. Identity never changes.

## Sound
- Music is `audio/music.wav` (synthesized with `music.mjs`) or a supplied track measured with `beats.py`.
- State changes land on `beats`, big moments on `downbeats`. Every visible event gets an SFX;
  file SFX are placed by their measured peak. Final mix -14 LUFS.
- Cues live in `index.html` (`CUES`, next to the events they score) and are exported with
  `node render.mjs --cues sfx_cues.json`; never hand-edit `sfx_cues.json`. Typed text gets a
  `key` cue per letter from `typeTimes`.
- Voiceover (optional) is `audio/voice.wav` from `voiceover.mjs`; each shot starts on its line's
  start time in `vo_script.json`, and `mix.sh --voice` ducks the music under it.
- API keys live only in `.env` and are referred to by variable name.

## Loop before showing anything
1. `node render.mjs --stills beats` (one still per beat) → open `out/stills/contact.png` and LOOK.
2. Score 1-10: hook, readability at phone size, motion quality, continuity, variety,
   composition, depth, polish, brand accuracy, sound sync.
3. Fix the 3 worst problems, log them in `docs/review_log.md`. Repeat until every score is 8+.
4. After each full render, `./check.sh` runs `motion-audit.mjs`: zero holds, zero unintended
   single-frame pops, zero sound-sync misses, and a clean loop seam if the video loops. Open the
   fastest frame at 1:1: edges streak, never step.
