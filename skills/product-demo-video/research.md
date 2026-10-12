# The Opus 5.5 motion style: what the viral videos actually do

Research behind this skill's defaults. Read it before writing `docs/style_guide.md` when the
user wants "the Opus 5.5 look". Numbers marked *measured* come from running `ref.mjs` and
`motion-audit.mjs` on the downloaded originals; the rest is from frame-by-frame contact sheets.

## Sources

| Video | Creator | What to take from it |
|-------|---------|----------------------|
| [Keynote launch film, prompt included](https://x.com/twoclipping/status/2103835273813496100) | zero (@twoclipping) | The whole grammar: one continuous take, dot → pill → iris → grid, flood/contract, cursor-driven, SFX by peak |
| [UI morph loop, prompt template](https://x.com/twoclipping/status/2103273003555402193) | zero (@twoclipping) | One container that never cuts, morphing through real UI states |
| [Product Hunt launch](https://x.com/RaphaelAubryy/status/2103401350897823974) | Raphael Aubry | The UI morph template applied to a real product |
| [Single-prompt showreel](https://x.com/kenn/status/2103337314021937232) | Kenn Ejima | Word slams on color fields, numbered chapter HUD, hard cuts on the beat |
| [Calendar app launch](https://x.com/LexnLin/status/2104148233106723099) | Leon Lin (@LexnLin) | Split layout (headline left, live UI right), UI in 3D tilt, count-ups, synthesized sound |
| [Inference startup launch](https://x.com/deedydas/status/2102787937482252537) | Deedy (@deedydas) | Instructional launch: chapter labels, strike-through, numbers that count |
| [How to build a motion design studio with Opus 5.5](https://x.com/0xMovez/status/2104216919033192746) | Movez (@0xMovez) | The harness: seek(t), springs, beat grid, critique loop, mascot rules |
| [Food-craving launch film, prompt included](https://x.com/ultimaxbt/status/2108210884799549714) | ultima (@ultimaxbt) | Agent/chat products: ask → think → drop → result → act. Keyed log-space camera, one move per scene, shared-element handoffs, typed text on fixed lines |
| [Inside-the-period loop, template](https://x.com/twoclipping/status/2105927781678747965) | zero (@twoclipping) | The whole film happens inside the wordmark's period. One morph table, one glide curve, glass, goo split/merge, counters on frame time |
| [Product launch, 15 s](https://x.com/achxvi/status/2103918792845963545) | Chain (@achxvi) | 9k likes for 15 s of real UI animating at 1080p: real product beats invented spectacle |
| [Studio-founder launch, 3 prompts](https://x.com/uxmiles/status/2104618175803609305) | Miles (@uxmiles) | A design studio's verdict: a few iterations on a strong brief beat one long prompt |
| [Getting the best videos from Opus 5.5](https://www.youtube.com/watch?v=747ZnEtsRbg) | YouTube walkthrough of Movez's article | "The prompt is 10%, the harness is 90%". Reference → style guide → shot list → beat grid table before code; critique loop with depth scores; 163 model calls behind the best film |

Reference library: [whatships.com](https://whatships.com) lists Opus 5.5 videos with links to the
original posts. Pick one whose grammar fits the product, then run `ref.mjs` on it.

Surveys: [yasue's ranking of 500 Opus 5.5 videos](https://en.yasue.org), a DEV Community roundup
of 475 videos, and the [openchamber.dev](https://openchamber.dev) index (5,054 videos, 841 with prompts).

## What the numbers say

- About 60% are motion graphics with product UI, about 80% are 16:9, median length 30 s.
- Engine: canvas in 336 of 475, SVG in 193, Three.js in 141. 2D canvas plus one WebGL plane is
  the sweet spot; full 3D scenes rarely make the top 100.
- *Measured:* the keynote film and both UI morph loops have **zero hard cuts**. The launch
  films have 1-2. Showreels cut on the beat (kenn: 9 single-frame jumps in 16 s).
- *Measured:* **no hold longer than 1 s** in any top video, except the end card (2-3 s).
- *Measured:* 60 fps, -14 LUFS (Deedy's was -19.5 and sounds quiet next to the others).
- 120 BPM is the default grid: a change every beat (0.5 s), a big moment every bar (2 s).

## The grammar

### Continuity (the single biggest tell)
Nothing fades, blurs in or crossfades. Every scene is built out of the previous one:
- **Dot → pill → button**: the brand's accent dot grows into a black pill, and a label rises inside it.
- **Mask rise**: text rises letter by letter out of a hard line and leaves the same way.
- **Iris**: six blades close over a label and open onto the next image.
- **Flood / contract**: a shape floods past the frame corners in about 0.3 s, then contracts
  as a hole onto the next scene. It must overscale past the corners or half the frame pops.
- **Collapse to the dot**: the whole scene scales into the accent dot, which travels to become
  the period of the wordmark. The last frame often equals the first.
- **Morph box**: one container changes size, radius and fill through the UI states, driven by one
  table of beat times so retiming is one edit.
- **Wordmark squeeze**: the letters slide into their own period like an accordion, and the dot
  carries the film. The end card reverses it, so the last frame equals the first.
- **Shared elements**: every handoff carries something across. The flood carries the bubble's
  words; the button carries its label into the page; lit dots pour into the next panel.
- **Goo split / merge**: one black orb splits into three result pills, which later merge back.
- **Glass**: a blurred copy of what's behind, clipped to the shape, plus a tint, a darker inner
  edge and a gradient rim. Never CSS `backdrop-filter` (misreads displacement maps in Chromium).

### Camera
- Screen-studio zooms toward whatever the cursor is about to touch; the cursor scales with the zoom.
- One eased move per scene. Never zoom in then out back to back, and never reverse direction
  mid-move. Key the camera as `[time, zoom, x, y]` and interpolate zoom in log space, so a 1× → 4×
  push feels as even as 1× → 2×.
- Morphs and camera share one curve: a 0.8 s glide on cubic-bezier(.45, 0, .15, 1). Springs are
  for pops and landings, the glide is for anything that travels.
- Never zoom into a tiny off-centre dot (it swings sideways and spikes). Open the dot instead
  (iris or portal) and reveal the next world inside it.
- Product UI on a 3D plane (tilted about 20-25° on y, 12-16° on x) that straightens as the camera pushes in.
- Depth of field: the UI behind goes soft (3-6 px blur) while one focus card stays sharp in front.
- UI bleeds off the frame edge. It is never a small centered screenshot with margins.

### Typography
- Split layout: a huge two-line headline on the left, live UI on the right.
- Heavy grotesk (Inter/Geist/Archivo 800), tracking about -0.04 em, accent-colored period.
- Mono for numbers, labels and kickers (`INBOX / LIVE`).
- Text and data effects: count-up numbers, strike-through draws, scramble/decode, typed text
  with a caret, word slams on full color fields, optional numbered chapter labels.
- Typing has a human rhythm (longer pauses after punctuation and spaces) and runs on fixed,
  pre-broken lines, so the camera never chases a wrapping caret.
- Never crop type at the frame edge; UI bleeds off the edge, headlines don't.

### Character
When there is a mascot (Movez, several of the top 100): a simple box shape, fixed proportions
and palette, squash and stretch on landings, blinks on a seeded schedule, eyes that follow the
cursor. Its identity never changes between shots.

### Sound
- A real SFX for every event (click, swish, pop, tick, thump), placed by its measured peak, not its file start.
- The song starts on a downbeat; the main reveal lands on the drop; loudnorm to -14 LUFS.
- Start the song a known number of beats before its drop, so the drop lands on the reveal
  (ultima: 12 beats before; zero: the song enters on its hit as the first pill appears).
- Typing gets a key sound per keystroke, on the same seeded times as the letters.

### Rendering
- 60 fps with motion blur. The originals used 4 or 8 fixed subframes blended with ffmpeg tmix,
  and both creators hit the same wall: "four subframes leave ghost copies on fast moves". This
  skill measures each frame's motion instead and spaces samples 3 px apart (see Gotchas).
- Check one frame per beat, then scan for single-frame pops (a frame difference spike 3× its neighbours).

## Gotchas from the originals

Each was published by the creators above after hitting it. The right column is how this skill avoids it.

| Gotcha | Handled by |
|--------|------------|
| Fixed 4-8 subframes ghost on fast moves, and more subframes blur text that sits still | `render.mjs --sub auto`: block-matches the shutter's two ends, then spaces samples ≤ 3 px apart; still frames stay sharp |
| Counters and typed text smear across subframes | `countUp`, `typeOn`, `scramble` read frame time (`frameLocal`), not subframe time |
| A flood shorter than ~0.3 s or short of the farthest corner reads as a flash | `flood`/`contract` size to the farthest corner (`farR`); `area: true` eases by area |
| A closing iris eased by radius jumps on its first frames | `iris` eases by area (`byArea`) |
| A helper that sets globalAlpha without restoring it makes fading cards pop | `alpha()` clamps and multiplies `SA`; every kit helper saves/restores |
| Cards float above the flood | Draw order is the layer order: flood last, or redraw what must sit on top |
| Zooming into an off-centre dot swings and spikes | `iris` / `portal` open the dot; `camPath` keys target whole cards, never a dot |
| Camera chasing a wrapping caret | `typeOn` on fixed lines (`\n` in the text) |
| Variables used before declaration in seek() | Declare everything at the top; `seekWith` runs after `ready` |
| Video seeking isn't frame-exact in headless Chromium (and can't decode H.264) | `prep-footage.mjs` → JPEG frame sequence; `footage()` + `seekWith()` |
| Sound drifts from picture when cues are edited by hand | `window.CUES` in index.html is the single source; `render.mjs --cues` exports it |

## Banned (zero's list, confirmed across the top 100)
Crossfades, blur-ins, brightness "developing", 3D flips, particles, glows, holds longer than
1 s, centered title on a gradient, anything that looks like a template.

## How this skill implements it

| Grammar | Kit / tool |
|---------|-----------|
| Mask rise, kinetic words, scramble, typed text, slams, count-up, strike | `maskRise`, `words`, `scramble`, `typeOn` (+ `typeTimes`), `slam`, `countUp`, `strike` |
| Dot → pill, morph box, one morph table | `morphBox`, `pill`, `mixColor`, `states` |
| Glide curve for morphs and camera | `GLIDE`, `glide`, `keyed` (lib/motion.js) |
| Flood, contract, iris with real blades, open the dot | `flood`, `contract` (`area`), `iris`, `portal` |
| Wordmark squeeze into its period (open and end card) | `squeeze` (`at: 'dot'` pins the dot) |
| Screen-studio camera, 3D UI plane, depth blur | `camPath` (keyed, log-space zoom), `camera`, `plane3d`, `blurred` |
| Glass panels, goo split/merge | `glass`, `goo`, `layerCtx`, `withCtx` |
| Real footage (wall, sunrise, screen recording) | `prep-footage.mjs`, `loadFootage`, `footage`, `seekWith` |
| Cursor-driven action | `cursorPath`, `cursor`, `ripple`, `toggle`, `chip`, `card` |
| Wordmark with accent period | `wordmark` |
| Mascot | `mascot` |
| One frame per beat | `render.mjs --stills beats` |
| Motion blur without ghosts | `render.mjs --sub auto --shutter 0.5`; samples never cross `window.CUTS` |
| Determinism (same frame in any order) | `render.mjs --verify` |
| Holds, pops, dead seconds, loop seam, sound sync | `motion-audit.mjs` (run by `check.sh`, `--cues` for sync) |
| Analyze any reference video or X post | `ref.mjs` |
| Real SFX aligned by peak, cues on the picture's timeline | `window.CUES` → `render.mjs --cues sfx_cues.json` → `sfx.mjs` (seeded detune, `key` voice) |
