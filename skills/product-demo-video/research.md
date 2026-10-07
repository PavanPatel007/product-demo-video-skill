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
- **Morph box**: one container changes size, radius and fill through the UI states.

### Camera
- Screen-studio zooms toward whatever the cursor is about to touch; the cursor scales with the zoom.
- Product UI on a 3D plane (tilted about 20-25° on y, 12-16° on x) that straightens as the camera pushes in.
- Depth of field: the UI behind goes soft (3-6 px blur) while one focus card stays sharp in front.
- UI bleeds off the frame edge. It is never a small centered screenshot with margins.

### Typography
- Split layout: a huge two-line headline on the left, live UI on the right.
- Heavy grotesk (Inter/Geist/Archivo 800), tracking about -0.04 em, accent-colored period.
- Mono for numbers, labels and kickers (`INBOX / LIVE`).
- Text and data effects: count-up numbers, strike-through draws, scramble/decode, typed text
  with a caret, word slams on full color fields, optional numbered chapter labels.

### Character
When there is a mascot (Movez, several of the top 100): a simple box shape, fixed proportions
and palette, squash and stretch on landings, blinks on a seeded schedule, eyes that follow the
cursor. Its identity never changes between shots.

### Sound
- A real SFX for every event (click, swish, pop, tick, thump), placed by its measured peak, not its file start.
- The song starts on a downbeat; the main reveal lands on the drop; loudnorm to -14 LUFS.

### Rendering
- 60 fps, 4 subframes blended (tmix) for motion blur on pure graphics.
- Check one frame per beat, then scan for single-frame pops (a frame difference spike 3× its neighbours).

## Banned (zero's list, confirmed across the top 100)
Crossfades, blur-ins, brightness "developing", 3D flips, particles, glows, holds longer than
1 s, centered title on a gradient, anything that looks like a template.

## How this skill implements it

| Grammar | Kit / tool |
|---------|-----------|
| Mask rise, kinetic words, scramble, typed text, slams, count-up, strike | `maskRise`, `words`, `scramble`, `typeOn`, `slam`, `countUp`, `strike` |
| Dot → pill, morph box | `morphBox`, `pill`, `mixColor` |
| Flood, contract, iris | `flood`, `contract`, `iris` |
| Screen-studio camera, 3D UI plane, depth blur | `camera`, `plane3d`, `blurred` |
| Cursor-driven action | `cursorPath`, `cursor`, `ripple`, `toggle`, `chip`, `card` |
| Wordmark with accent period | `wordmark` |
| Mascot | `mascot` |
| One frame per beat | `render.mjs --stills beats` |
| Holds, pops, dead seconds, loop seam | `motion-audit.mjs` (run by `check.sh`) |
| Analyze any reference video or X post | `ref.mjs` |
| Real SFX aligned by peak | `sfx.mjs` file cues (`{"t", "file"}`, aligned by peak unless `"align": "start"`) |
