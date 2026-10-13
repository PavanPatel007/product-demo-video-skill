# Product demo studio rules

## Files
- This folder is the workspace; all work stays here. The user's folder (`root` in `.pdv.json`)
  receives only the final MP4s, named `<product>-<format>.mp4`, plus `<product>.srt` when there's
  a voiceover. Never write anything else there.
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
- Assets live in `./assets` and are listed in `assets/README.md`. Every number, quote and claim
  on screen or in the voiceover names its source there (URL, file or the user's message).
- UI may be rebuilt as vector cards (`card`, `chip`, `toggle`) only with real copy and real colors
  from the captures. `skeletonUI()` is a placeholder for the template; never ship it.
- Prefer vector UI (`domPage` from `capture-dom.mjs`, or tokens from `assets/code`) over screenshots
  for anything the camera pushes into; use a screenshot where `compare.png` shows red.
- The product's code (if the user allowed it) is read-only: never run, build, edit or commit there.

## Look (the Opus 5.5 grammar, see research.md in the skill)
- Story first: `docs/brief.md` has a logline, a motif that opens the film and returns changed at
  the end, a world, and a payoff line. If the film could be about any product, it isn't done.
- A world, never a void: `ambient` light pools (a colour per chapter), a surface under `gobo`
  window light, or the product's own background. Flat black or white with nothing lit is banned.
- Show the product in a device (`phone`, `laptop`) with air around it, or pull one real element
  out of the app and show it big and alone. A full desktop page whose text can't be read at
  phone size is banned; push in until the part that matters is readable.
- The product moves itself: typed input, cards that insert and reorder (`stackY`), tab slides,
  `typingDots`, live counters, request words that fly into the result (`highlight`, `flyTag`).
  `callout` names what happened. Cursor, ring and chip only where a person would really click,
  never as the default on every scene. No numbered HUD chapters (except a kinetic showreel).
- One continuous take. Every scene is made out of the previous one: mask rise, dot → pill,
  iris, flood/contract, morph box, collapse into the accent dot. Hard cuts only on a downbeat,
  and only for showreel-style briefs.
- Banned: crossfades, whole-frame or paragraph blur-ins, brightness "developing", 3D flips,
  decorative particles, glows on elements, centered title on gradient, corner labels and frame
  borders, bouncy easing on text, anything that looks like a template.
- Blur is a lens: rack focus (`depthBlur` + `blurred`), short lines whose words pull into focus
  (`focusIn`), soft UI behind a sharp focus card, motion blur on whip pans (`whip`). Each focus
  pull ends sharp within about 0.35 s per word.
- Something changes on every beat, and the pace has contrast: a fast run, then a breath on the
  line that matters. No dead hold over 1 s, except the end card (about 2.5 s). Reading holds of
  up to 1.8 s (walkthroughs, brief I) and 2 s (explainers, brief H) are fine while something
  keeps living (`idleFloat`, a slow push, light drift, a ticking timer); audit them with
  `./check.sh ... --max-hold 2`.
- Camera: screen-studio zooms toward what the cursor touches; the cursor scales with the zoom.
  Product UI on a `plane3d` tilt that straightens as the camera pushes in; UI behind goes soft
  while the focus card stays sharp; UI bleeds off the frame edge.
- Camera moves with `camPath` (keyed `[time, zoom, x, y]`, zoom in log space): one glide per
  scene, never in-then-out back to back, never reversing mid-move, never into a tiny dot (open
  the dot with `iris` or `portal` instead).
- Anything that travels glides 0.8 s on cubic-bezier(.45,0,.15,1) (`glide`, `keyed`, `states`);
  springs are for pops and landings. Every handoff carries something across (shared element).
- One object carries the film (a dot, a prop, one number, the logo's parts) and becomes each next
  scene; use the product's own idea as a transition where it has one (research.md, Prompt Motion).
- No shot starts or ends still: enter on `arrive` (hard expo ease-out), leave on `depart` or a blur
  ramp. Hard cuts land at peak blur (`cutBlur`), on the music, about 2 frames before the beat.
- One world, one camera, never two camera moves at once; each scene starts at the zoom the last
  ended on. Outgoing titles leave before incoming titles take their space.
- Data is continuous: a hero number (`odometer`) survives the scene change into the UI that owns
  it. Draw cause → effect (`connector`, `flyTag`, `cardSwap`).
- About four visual ideas per 15 s; every important frame should work as a still ad. Headlines
  fit on one line. Always end on a lockup (logo, one line, one CTA), never a fizzle or a cut to black.
- Draw order is layer order: a flood is drawn after everything it covers. Floods clear the
  farthest corner in about 0.3-0.35 s. Typed text runs on fixed lines (`\n`), never wraps.
- Shadows grow with height (`card(..., {lift})`). Never crop type at the frame edge.
- Type: one heavy display face with tight tracking, one UI face, mono for numbers and kickers,
  one accent color, used for the period. Split layout in 16:9: headline left, live UI right.
- Text must read at 360 px wide. Never bitmap-scale text. On-screen copy: at most 8 words per
  line, 2 lines at a time. Text contrast at least 4.5:1 against what is behind it (3:1 for
  display sizes), and never carry meaning by colour alone (pair it with a word, icon or shape).
- No more than 3 flashes in any second (floods and colour-field slams count): the motion audit
  fails the render if there are.
- Mascot (if any): fixed proportions and palette, squash/stretch on landings, seeded blinks,
  eyes follow the cursor. Identity never changes.

## Sound
- Music is `audio/music.wav` (synthesized with `music.mjs`) or a supplied track measured with `beats.py`.
- State changes land on `beats`, big moments on `downbeats`. Every visible event gets an SFX;
  file SFX are placed by their measured peak. Final mix -14 LUFS. Elements that move as one
  group (a staggered row of cards) share one sound. Explainers put SFX only on the changes the
  viewer must notice, with one recurring musical motif, so the voice stays clear.
- Cues live in `index.html` (`CUES`, next to the events they score) and are exported with
  `node render.mjs --cues sfx_cues.json`; never hand-edit `sfx_cues.json`. Typed text gets a
  `key` cue per letter from `typeTimes`.
- Voiceover (optional) is `audio/voice.wav` from `voiceover.mjs`; each shot starts on its line's
  start time in `vo_script.json`, and `mix.sh --voice` ducks the music under it.
  `node captions.mjs --mux out/final_<format>.mp4` writes `out/captions.srt` from the real line
  timings and adds it to each MP4 as a subtitle track.
- API keys live only in `.env` and are referred to by variable name.

## Loop before showing anything
1. `node render.mjs --stills beats` (one still per beat) → open `out/stills/contact.png` and LOOK.
2. Score 1-10: hook, readability at phone size, motion quality, continuity, variety,
   composition, depth, story, craft, polish, brand accuracy, sound sync, accessibility. Run the
   slop check in briefs.md; every "yes" caps craft at 6. After the full render, a fresh agent that
   didn't build the film reviews it the same way, if your environment can start one.
3. Fix the 3 worst problems, log them in `docs/review_log.md`. Repeat until every score is 8+.
4. After each full render, `./check.sh` runs `motion-audit.mjs`: zero holds, zero unintended
   single-frame pops, zero flashes, zero sound-sync misses, and a clean loop seam if the video
   loops. Open the fastest frame at 1:1: edges streak, never step.
5. Muted test: read the contact sheet as if the sound were off; the story must still follow.
   Audio-only test (with a voiceover): read `vo_script.json` alone; it must make sense without
   the picture.
