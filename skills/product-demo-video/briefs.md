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

## F. Agent / chat product (ask → think → drop → result → act)

Adapted from ultima's food-craving film (research.md). Use it for any product where the user
types a request and the product does the work: assistants, agents, search, copilots.

```
<direction>
A [DURATION]-second launch film for [PRODUCT], one continuous take. Each scene grows from the
last: text rises from a mask line, buttons expand into pages, color floods from one object
before shrinking into another. The camera makes one glide per scene (camPath, log-space zoom)
and never zooms in and out back to back or reverses mid-move.
[BRAND BG] canvas, [BRAND FG] UI, accent [ACCENT]. Real [RESULT TYPE] from ./assets on the
result cards. [UI FONT] for UI, [DISPLAY FONT] for the end card.
Banned: crossfades, blur-ins, 3D flips, particles, glows, reversing camera, holds over 1 s.
</direction>

<structure>
[BPM] BPM, [BEATS] beats. Start the song [N] beats before its drop.
Ask (beats 0-6): push slowly into the real composer, about 3×. Type "[THE USER'S REAL REQUEST]"
on fixed lines (typeOn with \n) with a natural keystroke rhythm, one key sound per letter.
Send (beat 6): press send; an accent ripple turns the message into a chat bubble. Pull back
once to reveal the product around it.
Think (beats 6-12): the send button becomes [THINKING OBJECT from the product], which does
something on every beat under the product's real working label "[LABEL]".
Drop (beat 12, on the song's drop): an accent flood from the thinking object clears the
farthest corner in about 0.35 s; [RESULT CARDS] burst in; the strip slides and lands on
"[BEST RESULT]", which lifts with a "[BADGE]" pill.
Result: the flood contracts back into the bubble, carrying its words, while the chosen card
flies into its slot. The product's reply rises in: "[REAL REPLY]".
Act: two pills, "[PRIMARY ACTION]" and "[SECONDARY]". The cursor clicks the primary →
spinner → "✓ [DONE STATE]".
Outro: the button expands into the page, staying pill-shaped as it reaches the edges, while the
camera pushes into it. Its label grows to headline size and slides away. "[LINE 1]" / "[LINE 2]"
word by word. The accent dot travels and becomes the period of the wordmark.
</structure>

<gotchas>
Every handoff is a shared element (the flood carries the bubble's words, the button carries its
label). Draw order is layer order: cards never float above the flood. Keep typed text on fixed
lines. Declare every variable before the first seek().
</gotchas>
```

## G. Inside the period (looping, square or 16:9)

Adapted from zero's nightshift template (research.md). The whole film happens inside the
wordmark's period; it suits products that work while the user is away (automation, agents,
monitoring, scheduling).

```
<direction>
A [DURATION]-second looping launch film. Outside the period: [OUTSIDE WORLD, e.g. the product's
real site or a daytime photo] behind a black "[product]." wordmark. Inside the period: [INSIDE
WORLD] under glass panels (glass(): blurred backdrop, tint, inner edge, rim). Nothing cuts:
shapes morph, dots fly, colors change under floods. Every morph glides 0.8 s on
cubic-bezier(.45,0,.15,1) (glide / keyed / states), and the camera rides the same curve.
Banned: flat or gradient backgrounds made in code, camera zooms into tiny points, hard cuts,
crossfades, bouncy springs, particles, glows, holds over 1 s, cropped type.
</direction>

<structure>
Open: the letters squeeze into the period (squeeze, at: 'dot') while it glides to the middle.
The period opens like an iris (or portal) onto the inside world; "[HOOK LINE 1]" then
"[HOOK LINE 2]" roll through one mask line.
Ask: a glass "Ask [product]" pill springs in, the cursor clicks it, it glides into an input
and "[THE ONE JOB]" types out.
Work: send shrinks the input to a dot that ripples into [A GRID / LIST of the real objects];
a scan sweeps it and a counter counts [REAL NUMBER] (countUp reads frame time).
Results: the working shape turns black and goo-splits (goo) into [3 REAL RESULTS] pills;
checks pop on beats.
Proof: [REAL SCREEN from ./assets] with one hover and one number that counts.
Out: a flood from the proof becomes "[CTA] →", the cursor clicks, the button shrinks into a
dot, the scene closes into it like an iris, and the letters slide back out of the period.
Last frame = first frame.
</structure>

<build>
One morph table (states()) of beat times for the shape that carries the film, so retiming is
one edit. Render the inside world with layerCtx/withCtx and reveal it through the period with
portal() or iris(); never zoom the camera into the dot. Ease the closing iris by area.
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
composition · depth (camera, plane3d tilt, focus card over soft UI, shadows that grow with
height) · polish (no ghosts, no smears, no cropped type) · brand accuracy · sound sync.

After a full render, read the motion audit in out/check/motion.txt first: every hold over 1 s,
every single-frame pop that isn't a deliberate downbeat cut, every silent visible event and
every blind sound is an automatic problem.

List the 3 biggest problems with timestamps. Hunt for: a crossfade or blur-in where a shape
should transform, a flood that doesn't clear the corners, text overlapping during swaps,
descenders peeking under a mask line, anything sliding instead of springing, a small centered
screenshot instead of UI that fills and bleeds off the frame, a camera that doesn't move toward
the action, corner labels and frame borders, blurry scaled text, a dead beat, a stutter at the
loop seam, invented UI that is not in ./assets, a camera that reverses or zooms in then out,
a zoom into a tiny dot, smeared counters or typed text, ghost copies on fast moves (open the
fastest frame at 1:1), cards above a flood, type cropped by the frame, typed text that wraps,
a handoff that carries nothing across, a sound with nothing moving or a move with no sound.

Fix them, re-render the affected stills, append scores + fixes to docs/review_log.md.
```
