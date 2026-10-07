# Brief templates

Fill `[BRACKETS]` from the intake answers and the captured assets, save the result as
`docs/brief.md`, then execute it yourself. Do not hand these to the user to run.

## A. Launch reel (default)

```
Make a dynamic [DURATION]-second product demo for [PRODUCT] ([URL]), with the energy of a
motion designer's showreel. Go all out.

Assets
- Use real screenshots (Playwright), the real logo, real colors and fonts from ./assets.
- Never redraw the product UI from imagination. Crop and animate the real thing.

Story (one beat each, 2 to 4 seconds)
1. Hook: [PROBLEM] in 5 words or fewer of huge kinetic type.
2. The product appears; the UI assembles itself piece by piece.
3. [FEATURE 1], [FEATURE 2], [FEATURE 3]: each a UI moment with a cursor doing a real action.
4. One number that proves it works: [METRIC].
5. Logo lockup + [CTA].

Sound: [AUDIO PLAN]. UI clicks and whooshes on the beat grid.
Format: [PRIMARY FORMAT] first, then [OTHER FORMATS] from the same timeline, reframed not cropped.
```

## B. UI morph loop (SaaS / app UIs)

```
<direction>
Product-film UI motion. One container never cuts: every state is the same element changing
size, radius and fill while its content swaps behind a short blur. A cursor drives every change.
[BRAND BG] canvas, one accent [ACCENT]. Springs with at most a tiny overshoot.
Banned: bouncy easing, glows, gradients on UI chrome, particle bursts, dead time.
</direction>

<structure>
[BPM] BPM, [BARS] bars, something happens on every beat.
[8-12 UI STATES FROM THE REAL PRODUCT, e.g. logo -> CTA button -> email field (typed) -> loader
-> success check -> dashboard card -> chart draws itself -> tooltip -> Cmd-K palette -> toast -> logo]
Each state shows the real data from the product screenshot it came from.
</structure>

<build>
1. window.seek(t) only. No CSS transitions, timers, or carried state.
2. A value with many targets = track() (one spring per change).
3. Text inside a morphing container uses swapAlpha(): in after the morph starts, out before the next.
4. Tab indicators use indicator() so leading and trailing edges stretch.
5. Start on a downbeat. UI sounds on measured hits.
</build>

<gotchas>
The last frame must equal the first, cursor position and velocity included (loopT).
</gotchas>
```

## C. Voiceover / mascot add-on (append to A or B)

```
Voice: write a [DURATION]-second script (about 2.3 words per second) in [LANGUAGE].
Write it as vo_script.json, one line per shot: [{"t": <shot start>, "text": "..."}].
Generate it with `node voiceover.mjs say --provider [PROVIDER] --voice [VOICE_ID]`
(key read from .env by name). Fix every overrun it reports, then time each on-screen beat
to the phrase it illustrates. Mix with `./mix.sh ... --voice audio/voice.wav` (ducks music).
[Optional] Mascot: [DESCRIPTION]. Draw it in code with fixed proportions and palette; it
reacts (blink, point, bounce) on downbeats. Identity never changes between shots.
```

Never paste a real key into a prompt or file other than `.env`.

## D. Director's brief (45 s+, flagship launches)

```
You are the director, animator, sound designer and render engineer for a [DURATION] product
film made in code. Treat this as a multi-session production. Don't rush to a final render.

## The film in one line
[LOGLINE. What the viewer should feel and do at the end.]

## References and inputs
- ./refs/ : [reference]. Take the grammar, never the content.
- ./assets/ : real product captures. ./audio/ : [track or synthesized score].

## Look
[3-5 lines: palette, type, texture, camera language. Banned looks.]

## Beat sheet
0:00-0:02  hook: [the single most striking image]
0:02-...   [acts] - a new visual payoff every 3-5 seconds
[END]      logo + [CTA]; last frame sets up the first if it loops

## Workflow, with gates
1. docs/style_guide.md and docs/shotlist.md (every shot: time, camera, text, SFX).
2. Stills for every shot -> contact sheet -> critique.
3. Animatic at 960x540 (render.mjs --w 960 --h 540 --sub 1). Fix pacing before polish.
4. Full animation, polish pass, sound pass, final render.
5. For 4+ chapters, write docs/ANIMATION_GUIDE.md first, then split chapters across
   subagents so every subagent codes in the same style.
```

## Reference extraction (when the user gives a video, frame or folder)

```
1. Video: extract one frame every 0.5 s with ffmpeg into refs/frames/. Frame/folder: use as-is.
2. Write docs/style_guide.md: palette (hex), type (family, weight, tracking), shot lengths,
   transition types, camera moves, texture/grain, how text enters and exits.
3. Take the grammar of the reference, never its content, logos or characters.
```

## Critique pass (run after every stills or full render)

```
Open the contact sheet (and strip.png / phone.png after a full render) and look at them
properly. Be a harsh motion director, not a proud author.

Score 1-10: hook in first 2s · readability at phone size · motion quality (springs, no dead
frames) · variety (new thing every 2-4s) · composition · brand accuracy · sound sync.

List the 3 biggest problems with timestamps. Hunt for: text overlapping during swaps,
anything sliding instead of springing, corner labels and frame borders, centered-on-gradient
shots, blurry scaled text, a dead beat with nothing happening, a stutter at the loop seam,
invented UI that is not in ./assets.

Fix them, re-render the affected stills, append scores + fixes to docs/review_log.md.
```
