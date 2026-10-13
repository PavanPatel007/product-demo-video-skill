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

Reference libraries: [prompt-motion.com](https://prompt-motion.com) (films with their full prompts;
search it with `gallery.mjs`, see "Prompt Motion library" below) and [whatships.com](https://whatships.com)
(Opus 5.5 videos with links to the original posts). Pick one whose grammar fits the product, then run `ref.mjs` on it.

Surveys: [yasue's ranking of 500 Opus 5.5 videos](https://en.yasue.org), a DEV Community roundup
of 475 videos, and the [openchamber.dev](https://openchamber.dev) index (5,054 videos, 841 with prompts).

## What makes it look made by a designer (2026-10 references)

The films above are the grammar. These two are the level to aim for: both read as if a motion
designer made them, and both were studied frame by frame at 8-12 fps (`ref.mjs` now writes those
strips to `refs/<name>/moves/`).

| Video | Creator | Kind |
|-------|---------|------|
| [Planner app walkthrough](https://x.com/AmandaSartini/status/2109031846327828739) | Amanda Sartini | Calm Apple-style walkthrough: real phone and Mac, one chapter per feature |
| [Boon, "Leave the rest to boon"](https://x.com/LexnLin/status/2109718604883370450) | Leon Lin (@LexnLin) | Story film for an assistant: 40 s, a motif that opens and closes it |

*Measured:* both are one continuous take with zero hard cuts, 60 fps. Amanda's holds four times
for 1.2-1.8 s (the reading moments) and is -16 LUFS; Lex's never holds over 1 s and is -13.8 LUFS.

### Why the earlier output reads as "AI slop" next to them
Compared with a PilotDeck render from this skill (56 s, 10 chapters):

| Slop tell (what we did) | What the expert films do instead |
|---|---|
| Numbered HUD chapters "01 / RESEARCH", "02 / WRITE" … on every scene | A word kicker at most ("CAPTURE"), and in Lex's film no labels at all: the story carries the order |
| A whole desktop dashboard filling the frame, too dense to read | The product sits in a **device** (phone, Mac) with air around it, or **one element is pulled out** of the app and shown big and alone (a notification, a chat bubble, a booking card) |
| Flat black or flat white voids between scenes | A **world**: soft pools of light that change colour per chapter; a desk with window light whose colour shifts from day to dusk; a night sky |
| A cursor, a ring and a chip on every scene | The product **moves itself**: text types into the real input, a new card inserts and pushes the list down, cards reorder, a tab slides, a timer ticks, typing dots. Callouts with hairlines name what happened ("Due date found") |
| A feature list in a fixed order, every scene built the same way | A **story device**: an object from the first frame comes back changed at the end (Lex: the to-do list opens the film; every task gets checked off and turns into a star; the last one, "call mom", is left for you) |
| Every beat equally busy | **Contrast in pace**: a fast flurry, then a 1-1.5 s breath on the line that matters, kept alive by a float or a slow push |
| Mono count-up as the proof | Proof shown inside the product (the booking card filled in, the lock-screen notification) |
| Logo + pill button end card | A payoff line that finishes the story ("Leave the rest to boon") or the product on both devices ("Your day, on your phone and your Mac.") |

### Amanda: the calm walkthrough (template I in briefs.md)
- **Layout system that never changes:** off-white base, chapter text left (kicker with a small
  icon, light first line, bold second line, one muted sentence), the device right. Only the light
  changes: a large soft pool behind the device turns lavender → pink → yellow → blue per chapter,
  then the whole set goes navy for "Focus" and back to light for the ending.
- **Chapter swap:** the text block dims to grey for about 0.3 s, then leaves; the new kicker,
  lines and body mask-rise in order. The device does not leave: it carries across chapters.
- **The device is the camera:** the phone rises from below on a heavy spring, then the camera
  pushes until the phone is larger than the frame and crops at the edges, on exactly the part
  being shown. Between chapters it glides to the next region (scroll, tab).
- **The app performs:** typed input ("Finish client homepage by Fri"), the new card inserts and
  the list reflows, cards reorder (the blue card grows, the others collapse), a tab slides to
  Coach, chat bubbles and typing dots arrive, the focus timer counts down live, a card completes
  and collapses to "All done for today".
- **Callouts:** small white labels with a hairline and a dot on the exact UI part ("Time
  estimated", "Due date found", "First step, written for you"). They replace cursor and ring.
- **Ending:** the Mac slides in next to the phone; one line above: "Your day, on your phone and your Mac."

### Lex (Boon): the story film (template J in briefs.md)
- **Opening:** a checkbox and a word in extreme close-up, out of focus, pulled sharp as the camera
  pulls back; tasks keep appearing (each one focusing in) until the frame is a wall of to-dos.
  The problem is shown, never said.
- **The character is the transition:** the mascot types "…" then asks "Want me to take a few of
  those?" (each word focuses in), a reply chip "all of them?" pops, and the mascot grows to fill
  the frame (its yellow is the flood), shrinks to a white world, and a whip move lands on the phone.
- **Real surfaces:** the phone lies on a desk under window light; the light slides and changes
  from cool day to pink dusk while the chat plays. Then the camera dives into the black screen
  and comes out on the lock screen at 6:12 (time passing through light and a clock).
- **Request becomes result:** key words in the user's message get a yellow highlight, lift off as
  tags and fly into the booking card fields they filled.
- **Eyes as a portal:** in the dark, the mascot's two eyes open as pink ovals that grow into a
  world of floating memory cards with depth of field (near cards sharp, far cards soft).
- **Verb chapters:** "books." "reminds." "replies." "plans." "remembers." Each is a colour field
  with the to-do wall blurred behind, the original task checked off with a strike, then the real
  result card. Moves between them are whip pans (directional motion blur), on the beat.
- **Ending that pays off the opening:** back to the to-do wall at night; every task gets checked
  in a cascade and dissolves into stars, except "call mom". The mascot: "That one's all yours."
  "Leave the rest to boon" (the mascot's eyes are the oo's), the eyes blink shut, black, the
  "call mom" checkbox pulses twice and fills, and the dot grows to fill the frame in white.

### Rules taken from them (they override older lines below where they conflict)
1. **Story before shots.** Write the logline and the motif first: the object that opens the
   film, how it returns, the payoff line. A feature list is not a structure.
2. **Show the product inside a frame the eye can rest on:** a device with air around it, or one
   extracted element big and alone. Never a full desktop page at a size nobody can read.
3. **Build a world:** light pools, a surface, light that changes with the story. No flat void.
4. **Let the product move itself;** callouts name what happened. A cursor only where a person
   would really click, never on every scene.
5. **Blur is a lens, not a fade.** Rack focus and words pulling into focus (≤0.35 s each, ending
   sharp) are what cameras do; a whole frame fading from blur is still banned.
6. **Pace has contrast.** Holds of 1.2-1.8 s are allowed on reading moments when something keeps
   living (float, slow push, light drift, a timer). Dead frames are still banned.
7. **Bookend.** The last shot answers the first.

## Prompt Motion library (prompt-motion.com, 2026-10)

[prompt-motion.com](https://prompt-motion.com) curates Opus 5.5 motion films with the creator's
prompt, tags and original post: 233 films when studied, 100 tagged Product UI or Phone. Most prompts
are one line; the craft is in about a dozen long ones. 19 films (the long-prompt product films and
the four top showreels) were analysed frame by frame with `ref.mjs` strips. Find more with
`node gallery.mjs [words] --tag "Product UI"` and analyse any entry with `node ref.mjs <entry link>`
(it saves the creator's prompt to `refs/<name>/prompt.md`). Prompts and videos belong to their
creators: link the entry, never copy a prompt into a repo.

| Film | Why it matters |
|------|----------------|
| [Frame by Frame launch remake](https://prompt-motion.com/notdwd-7de38a) ([side by side](https://prompt-motion.com/notdwd-c2037d)) | A keynote sting rebuilt frame for frame from a real launch film. Source of "enter moving, leave accelerating" and "cut at peak blur" |
| [Taxtello bookkeeping film](https://prompt-motion.com/daniel-haida-8691d4) | Fintech restraint: chaos → control → clarity → brand; every transition is a product object (receipt → booking row, amount → invoice, bar → ring → the "o" of the wordmark) |
| [ViralGrow promo](https://prompt-motion.com/samuel-yostt-891f87) | Object chain: dot → pill → avatar → slot reel → card → phone → card fan → app icon |
| [BlueVisa travel promo](https://prompt-motion.com/thismacapital-dfba20) | One prop threads the film (ticket → plane → suitcase → dolly through it); a status card stack ticking through steps |
| [mdfor.dev editor intro](https://prompt-motion.com/ho-ba-f3f0e9) | The product's own idea as the transition (markdown → rendered serif); a connector line from what you type to what it renders |
| [Dub promo](https://prompt-motion.com/steventey-0d20e4) | One number lives through three scenes (odometer → dashboard tab → chart); slow build, four-cuts-a-second burst, rest |
| [hooklab UGC ad generator](https://prompt-motion.com/twoclipping-6dd14e) | An accent word becomes a bar, a button, then the app; an iris out of the clicked button |
| [Ora 2 image model](https://prompt-motion.com/rossaxbt-3085b7) | Voice-locked typed captions, 16th-note image runs, liquid glass with an edge-refraction band, a drifting camera that never resets |
| [Prompt Motion site promo](https://prompt-motion.com/antonio-kodheli-490109) | One world layer and one camera; a full-bleed shot that pulls back into its tile (radius → 0 at full bleed); a pill that survives the scene, relabels and docks |
| [Spotify product film](https://prompt-motion.com/brainextends-e19ac3) | A persistent player bar and one artwork carried through five contexts. Also a warning: crossfade double exposures and tiny type in a big stage |
| [Enxovaly baby app](https://prompt-motion.com/gabrielbuzziv-4ff0c6) · [Distilbook](https://prompt-motion.com/ajith-io-c52e09) · [Supademo](https://prompt-motion.com/jhylee95-e1152f) · [SuperX](https://prompt-motion.com/robj3d3-b18fad) | Light as transition (a lamp blooms to white), the logo becoming the chapter stepper, verbs that demonstrate themselves, one motif carried by light |
| [Top showreels](https://prompt-motion.com/stephanlivera-df17a2): [shneural](https://prompt-motion.com/shneural-2abdfa), [ajith_io](https://prompt-motion.com/ajith-io-b5626e), [himanshu](https://prompt-motion.com/himanshutwtxs-5f4b43) | Motion vocabulary: a hero dot that becomes iris, flood, full stop and cursor; design-tool selection boxes; marquee rows; shape morphs |

### What all the strong ones share
1. **One object carries the film.** A dot, a prop, a number or the logo's own parts becomes every
   next scene. "Of course the next scene came from that." Taxtello's brief puts it as: a card
   becomes the next card, a chart line becomes a connector, a number becomes the next interface.
2. **Shots never start or end still.** Each enters already moving on a hard expo ease-out (most of
   the distance in the first frames, `arrive`) and leaves on an accelerating move (`depart`) or a
   blur ramp. Hard cuts land at peak blur (`cutBlur`), on the music, about 2 frames before the beat.
3. **The camera is continuous and single.** One world, one camera, never two camera moves at once;
   a scene starts at the zoom the last one ended on; a slow 1.0 → 1.04 drift during holds.
4. **The product's own idea is the transition** (markdown → rendered text, a receipt → a booked row,
   a short link that swallows a long URL). Generic wipes are the fallback, not the plan.
5. **Data is continuous:** one number counts, survives a scene change and lands in the UI that owns it.
6. **Cause → effect is drawn:** a connector from the action to its result, a word that flies into
   the field it filled, a status card that ticks.
7. **Restraint:** about four visual ideas in 15 s; three extraordinary moments beat ten mediocre
   ones; every important frame works as a still ad; headlines fit on one line.
8. **Pace has a shape:** build, a burst (16th-note runs or a four-cuts-a-second montage), rest.
   A strict beat grid, broken once at the payoff (a 3-frame blackout before the drop).
9. **Always end on a lockup** (logo + line + one CTA). The films that cut to black or fizzle out
   are the weakest moments in the set.

### Slop tells seen even in popular entries
Crossfade double exposures and dips to black between scenes; the same headline-left/visual-right
layout four times in a row; the same blur-in on every line; micro UI labels nobody can read;
AI-generated faces, stock photos or placeholder grey-bar UI instead of the product; generic globes,
vortexes and constellations; 2.8 s or longer dead end cards; one-word-per-beat rhythm kept so long it
goes monotonous; a highlight box behind a word (reads as a text selection; use an underline or a
colour change); a 0.05 s fade (reads as a pop: use at least 0.3 s, or a real move).

### Gotchas from the prompts
- If the page colour matches a tile or a white card, it vanishes: give it a 1 px hairline and a faint shadow.
- Outgoing titles must leave before incoming titles take the same space.
- Heavy blur tables can wipe a shape out; if a frame looks empty, lower the blur until it reads.
- Measure text only after fonts load; a long product name must rescale the whole lockup.
- If the camera resets to 1.0 at a handoff, the zoom snaps. Start each scene at the last zoom.
- Clips with their own HUDs or cuts don't belong where the frame should feel calm.
- Have a fresh critic who didn't build the film review the render (Prompt Motion promo).

## What the numbers say

- About 60% are motion graphics with product UI, about 80% are 16:9, median length 30 s.
- Engine: canvas in 336 of 475, SVG in 193, Three.js in 141. 2D canvas plus one WebGL plane is
  the sweet spot; full 3D scenes rarely make the top 100.
- *Measured:* the keynote film and both UI morph loops have **zero hard cuts**. The launch
  films have 1-2. Showreels cut on the beat (kenn: 9 single-frame jumps in 16 s).
- *Measured:* **no hold longer than 1 s** in the fast launch films, except the end card (2-3 s).
  Calm walkthroughs (Amanda's) hold 1.2-1.8 s on reading moments, with the device still floating.
- *Measured:* 60 fps, -14 LUFS (Deedy's was -19.5 and sounds quiet next to the others).
- 120 BPM is the default grid: a change every beat (0.5 s), a big moment every bar (2 s).

## The grammar

### Continuity (the single biggest tell)
Nothing fades or crossfades, and nothing blurs in except through a lens (focus pull, see the
2026-10 rules above). Every scene is built out of the previous one:
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
Crossfades, blur-ins of whole frames or paragraphs, brightness "developing", 3D flips, decorative
particles, glows on elements, dead holds (over 1 s with nothing moving; reading holds up to 1.8 s
need a float, push or drift), centered title on a gradient, numbered HUD chapter labels on every
scene, full desktop pages too small to read, flat voids between scenes, anything that looks like
a template. Allowed because a camera does them: rack focus, words pulling into focus, depth of
field, motion blur on whip pans, soft light pools that light the set.

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
| Holds, pops, dead seconds, flashes, loop seam, sound sync | `motion-audit.mjs` (run by `check.sh`, `--cues` for sync) |
| Analyze any reference video or X post | `ref.mjs` (sheet, 12 fps motion strips, cuts, palette, loudness) |
| A world: light pools per chapter, window light, night sky | `ambient`, `gobo`, `stars` |
| Lens: rack focus, words pulling into focus | `depthBlur` + `blurred`, `focusIn` |
| Walkthrough chapters and annotations | `chapterBlock` (kicker, light/bold lines, body, dim-then-leave), `callout` |
| Devices | `phone`, `laptop`, `idleFloat` for reading holds |
| The product moving itself | `stackY` (FLIP list reorder/insert), `typingDots`, `highlight`, `flyTag` (request word → result field), `checkDot` |
| Whip pan between chapters | `whip` (the renderer's motion blur makes the streak) |
| Enter moving, leave accelerating, cut at peak blur | `arrive`, `depart` (lib/motion.js), `cutBlur`, `smear`, `zoomSmear` |
| Cursor with body language | `cursorPath` returns `hover` and `rot`; `cursor(x, y, press, a, { hover, rot })` |
| Object chains and shared elements | `textRect` (a word becomes the next object), `matchFrame` (tile ↔ full bleed), `bendToRing`, `revealFrom`, `orbit`, `layouts` + `layoutMorph` |
| Cause → effect | `connector`, `flyTag`, `cardSwap`, `scan`, `selectionBox` |
| Data that lives across scenes | `odometer`, `areaChart` (draw, glowing head, scrub tooltip), `pushSwap`, `slider` |
| Copy | `rotateWord` (one slot in a fixed sentence), `gradientText`, `karaoke` (voice-locked), `glassText` (frosted title, `clip` to the card) |
| Wipes, glints, surfaces | `bandWipe`, `glint`, `glass({ refract })`, `reflection`, `marquee`, `reel`, `stepIndex` + `stepTimes` (16th-note runs) |
| Find and read gallery references | `gallery.mjs`, `ref.mjs <prompt-motion.com entry>` (+ `prompt.md`) |
| Real SFX aligned by peak, cues on the picture's timeline | `window.CUES` → `render.mjs --cues sfx_cues.json` → `sfx.mjs` (seeded detune, `key` voice) |
