# Brief templates

Fill `[BRACKETS]` from the intake answers and the captured assets, save the result as
`docs/brief.md`, then execute it yourself. Do not hand these to the user to run.

## E. Keynote continuous take (default look)

Adapted from zero's launch-film prompt (see research.md). The template `index.html` is a
working 11 s version of this structure; extend it, don't start over.

```
<direction>
An Apple-keynote launch film for [PRODUCT] ([URL]), one continuous take, [DURATION] seconds.
Every scene is made out of the previous one: nothing fades, blurs in or cuts. Objects change
shape instead: text rises out of a mask line, cards pop from zero on a spring, numbers count up,
a black shape floods the whole frame and contracts into the next scene.
[BRAND BG] canvas, [BRAND FG] UI, one accent [ACCENT] used for the dot and the period.
[DISPLAY FONT] 800 with tight tracking for headlines and the wordmark, [UI FONT] for UI,
mono for numbers and kickers. A cursor drives every change with real clicks. The camera zooms
screen-studio style toward whatever the cursor touches, and the cursor scales with it.
The real product UI sits on a 3D plane that straightens as the camera pushes in; the UI behind
goes soft while the focus card stays sharp, and the UI bleeds off the frame edge.
Banned: crossfades, blur-ins, brightness "developing", 3D flips, particles, glows, holds longer
than 1 s, anything that looks like a template.
</direction>

<structure>
[BPM] BPM, [BEATS] beats, something happens on every beat.
Open: the accent dot grows into a black pill, "[CTA VERB]" rises inside it, the cursor clicks,
and the pill floods the frame.
Product: the flood contracts onto [REAL SCREEN] tilted in 3D with a two-line headline
"[LINE 1]. / [LINE 2]." (accent periods). The headline leaves through its mask line as the
camera pushes into [FEATURE 1].
Features: [FEATURE 1], [FEATURE 2], [FEATURE 3], each a real cursor action on a sharp focus
card over the blurred UI, each result landing on the next beat (toast, toggle, chart draws).
Proof: [METRIC] counts up on a card attached to the UI.
End: the scene collapses into the accent dot, which travels to become the period of the
[PRODUCT] wordmark. CTA pill and URL typed under it. Hold about 2.5 s.
[IF LOOPING: the last frame equals the first.]
</structure>

<build>
Use lib/kit.js: maskRise, scramble, typeOn, countUp, pill, card, chip, toggle, cursorPath,
camera, plane3d, blurred, morphBox, flood, contract, iris, wordmark. Scenes take absolute t,
events on B(n). Every visible event gets an SFX in sfx_cues.json. Render stills with
--stills beats, run check.sh, and fix every hold and pop the motion audit reports.
</build>
```

## A. Kinetic launch

```
Make a dynamic [DURATION]-second launch film for [PRODUCT] ([URL]), with the energy of a
motion designer's showreel. Go all out.

Assets
- Use real screenshots (Playwright), the real logo, real colors and fonts from ./assets.
- Never redraw the product UI from imagination. Crop and animate the real thing.

Story (a change on every beat, a new idea every bar)
1. Hook: [PROBLEM] in 5 words or fewer, slammed word by word on full color fields (slam()).
2. Optional numbered chapter labels ("01 / CONNECT") in mono, scrambling in and out.
3. The product appears; the UI assembles itself piece by piece on a plane3d tilt.
4. [FEATURE 1], [FEATURE 2], [FEATURE 3]: each a UI moment with a cursor doing a real action.
5. The old way struck through (strike()), then one number that proves it: [METRIC] counting up.
6. Wordmark with the accent period + [CTA].

Hard cuts are allowed here, but only on downbeats, and every cut is covered by a sound.
Sound: [AUDIO PLAN]. A real SFX on every event, placed by its peak.
Format: [PRIMARY FORMAT] first, then [OTHER FORMATS] from the same timeline, reframed not cropped.
```

## B. UI morph loop (SaaS / app UIs)

```
<direction>
Product-film UI motion. One container never cuts: every state is the same element changing
size, radius and fill (morphBox) while its content rises in and out of its own mask (maskRise).
A cursor drives every change.
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
[Optional] Mascot: [DESCRIPTION, or the kit's box character]. Draw it with mascot(): fixed
proportions and palette, squash and stretch when it lands, seeded blinks, eyes that follow the
cursor (look). It reacts on downbeats. Identity never changes between shots.
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

## Reference extraction (when the user gives a video, X post, frame or folder)

```
1. Video or post: node ref.mjs <x.com status URL | .mp4 URL | file> [--name <name>].
   Open refs/<name>/sheet.png and read refs/<name>/analysis.md (cuts, shot lengths, palette,
   LUFS, motion per second, holds). If the post text contains the creator's prompt, study its
   direction and structure. Frame/folder: use as-is.
2. Write docs/style_guide.md: palette (hex), type (family feel, weight, tracking, case), how
   text enters and leaves, transition types, camera moves, UI treatment (flat, 3D tilt, depth
   blur), pacing (beats per change, longest hold), sound feel.
3. Map each transition to a kit function (research.md, last table). Build anything missing
   in lib/kit.js as a pure function of t.
4. Take the grammar of the reference, never its content, logos or characters.
```

## Critique pass (run after every stills or full render)

```
Open the contact sheet (and strip.png / phone.png after a full render) and look at them
properly. Be a harsh motion director, not a proud author.

Score 1-10: hook in first 2s · readability at phone size · motion quality (springs, no dead
frames) · continuity (each scene made out of the last) · variety (a change every beat) ·
composition · brand accuracy · sound sync.

After a full render, read the motion audit in out/check/motion.txt first: every hold over 1 s
and every single-frame pop that isn't a deliberate downbeat cut is an automatic problem.

List the 3 biggest problems with timestamps. Hunt for: a crossfade or blur-in where a shape
should transform, a flood that doesn't clear the corners, text overlapping during swaps,
descenders peeking under a mask line, anything sliding instead of springing, a small centered
screenshot instead of UI that fills and bleeds off the frame, a camera that doesn't move toward
the action, corner labels and frame borders, blurry scaled text, a dead beat, a stutter at the
loop seam, invented UI that is not in ./assets.

Fix them, re-render the affected stills, append scores + fixes to docs/review_log.md.
```
