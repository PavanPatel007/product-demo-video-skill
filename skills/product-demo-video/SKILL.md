---
name: product-demo-video
description: >-
  Creates product demo, launch, and promo videos rendered from code, tuned for Claude Opus 5.5:
  checks the model, asks a minimal set of intake questions (including an optional AI voiceover
  with ElevenLabs, OpenAI, Google or Azure), captures the real product, plans shots on a beat
  grid, builds a deterministic seek(t) canvas animation in the viral Opus 5.5 style (one
  continuous take, mask-rise type, 3D UI with screen-studio camera, flood and iris transitions,
  count-ups, mascot), analyzes reference videos or X posts, critiques its own frames and motion
  until every score is 8+, renders MP4s in 16:9, 9:16 and 1:1 with music, SFX and voice, and
  ends with a token and cost report. Use when the user asks for a product demo video, launch
  video, app promo, walkthrough video, product reel, motion ad, or animated explainer.
---

# Product Demo Video (Opus 5.5 motion studio)

The model writes a program, not a video: `index.html` exposes `window.seek(t)`, headless Chrome
paints every frame, ffmpeg encodes. The prompt is 10% of the result; the harness (real assets,
springs, beat grid, critique loop) is the other 90%.

`SKILL_DIR` below means the folder containing this file (e.g. `~/.claude/skills/product-demo-video`,
`~/.cursor/skills/product-demo-video`, `~/.codex/skills/product-demo-video`, or `skills/product-demo-video`
in a cloned repo).

**Asking questions.** Whenever this skill says "ask", use your structured question tool if you
have one (Cursor `AskQuestion`, Claude Code `AskUserQuestion`, ...). Otherwise print the options
as a numbered list, first option = recommended, and wait for the reply. Ask each round in one turn.

## Step 0a: Model check (gentle reminder)

You know which model you are. If it is **Claude Opus 5.5**, say nothing and go to Step 0b.

Otherwise, before anything else, show this once (fill in your model name) and ask:

> Quick heads-up: this skill is tuned for **Claude Opus 5.5**. You're on **<your model>**.
> It will still work, but Opus 5.5 is noticeably better at the motion design, layout and
> self-critique this needs. To switch: Claude Code `/model` → Opus 5.5 · Cursor: the model
> picker under the chat box · Codex / other agents: pick a Claude Opus 5.5 model in settings or
> your API provider (Anthropic, Bedrock, Vertex, OpenRouter). Use high thinking effort
> (max for flagship launches).

Question `model`: "Continue on this model or switch first?"
1. Switch to Opus 5.5 first (Recommended): stop here; the user re-runs the skill after switching.
2. Continue with <your model>.

Never block: if they continue, use the same workflow with no shortcuts.

## Step 0b: Toolchain and voice check (silent)

```bash
node SKILL_DIR/studio/doctor.mjs
```

It checks node, ffmpeg, Playwright, and which voice API keys exist (names only, never values) in
the environment, `~/.config/product-demo-video/.env`, or a `.env` in the user's folder. Run it
here just to read the voice providers; Step 1 runs it again in the workspace. Fix missing tools
yourself where you can; tell the user only what needs them (e.g. installing ffmpeg).

## Step 0c: Intake (the minimal questions)

Skip anything the user already answered. In plain text, ask only for what can't be multiple choice:
> What's the product URL? Optional: the 3 features to show, one proof number, and the CTA.
> If the app is behind a login: test credentials (add them to `.env`, I'll only look, never change data).

Then ask these in one round (first option = recommended / default):

| id | Prompt | Options |
|----|--------|---------|
| `style` | What kind of demo? | Launch reel: hook, UI in action, 3 features, proof, CTA (Recommended) · Product walkthrough: real app screens, cursor and highlights · UI morph loop: one shape morphs through 8-12 real UI states · Flagship film, 45 s+ |
| `length` | How long? | 20-30 s (Recommended) · 15 s · 45-60 s |
| `format` | Which formats? | 16:9 for web and decks (Recommended for walkthroughs) · 9:16 first, then 1:1 and 16:9 (Recommended for social) · 9:16 only · 1:1 only |
| `music` | Music? | Original track synthesized in code + UI sounds (Recommended) · I'll supply a track (any audio file; copy it to `audio/track.wav` in the workspace) · No music |
| `voice` | Add an AI voiceover? | built from doctor output, see below |
| `look` | Which look? | Keynote continuous take in the product's brand: one unbroken shot, UI in 3D, flood and iris transitions (Recommended) · Kinetic launch: word slams, chapter labels, hard cuts on the beat · Match a reference video or X post I'll give you · Both brand and neutral house style: two versions |
| `mascot` | Add a mascot character? | No (Recommended) · Yes: a simple box character that reacts on the beat (or describe yours) |

**`voice` options, always in this order.** Mark each `(key found)` or `(needs KEY_NAME in .env)`
from the doctor output:
1. ElevenLabs, most natural voices (Recommended)
2. OpenAI TTS
3. Google Cloud TTS
4. Azure AI Speech
5. Free local voice (macOS `say` / espeak), for drafts and timing only
6. No voiceover (music and sound effects only)

If they pick a provider without a key: tell them to add `KEY_NAME=...` to
`~/.config/product-demo-video/.env` (works for every future video) or to `.env` in their own
folder (template: `SKILL_DIR/studio/env.example`). **Never ask them to paste a key in chat.**
Offer to continue meanwhile with the free local voice for timing and swap the real voice in
before the final render.

If the user says "just go", use every default (no voiceover) and infer features, metric and CTA
from the site.

## Step 1: Workspace

**The user's folder gets the final MP4s and nothing else.** Never create a project folder,
`node_modules`, screenshots, drafts or config files there. All work happens in a workspace
outside it, named after the product:

```bash
node SKILL_DIR/studio/workspace.mjs init <product>   # run from the user's folder; prints WORK and ROOT
cd <WORK>                                            # every command below runs here
node doctor.mjs                                      # must be all ✓ for required tools
# only for a supplied music track:  pip install numpy librosa soundfile
```

`init` creates `~/.cache/product-demo-video/projects/<product>/` with the studio files, records the
user's folder as ROOT in `.pdv.json`, and installs Playwright once for every future video. If the
workspace already exists (a follow-up edit), it is reused as is. Remember ROOT: Step 8 copies the
final MP4s there.

Read `house-rules.md` in the workspace now and follow it for everything below. Note the start
time; you'll report total time at the end.

## Step 2: Capture real assets

```bash
node capture-site.mjs https://product.com               # hero, full page, sections, brand.json (colors, fonts, logo)
node capture-app.mjs /dashboard /reports                # logged-in app (APP_URL/APP_EMAIL/APP_PASSWORD in .env), read-only
node capture-parts.mjs /dashboard                       # crops cards/panels so they can animate separately
node probe-targets.mjs targets.json                     # CSS boxes of text you'll ring or click → assets/targets.json
```

Download the fonts listed in `assets/brand.json` to `assets/fonts/` and declare them with
`@font-face`. Write `assets/README.md` listing every file and what it shows. Never invent
screens or numbers.

Capture gotchas:
- `networkidle` hangs on sites with live trackers; the scripts use `load` plus a delay.
- Apps often scroll inside an inner pane, so `fullPage` adds nothing. Use a tall viewport
  (`--h 3200`) and crop parts from DOM boxes.
- Off-canvas drawers (x > viewport) break clips and add shadows; the scripts skip them.
- Never click anything that writes data (save, delete, send, publish, logout).

## Step 3: Reference, brief, style guide, script, beat grid

1. Read [research.md](research.md): the measured grammar of the top Opus 5.5 videos. It is the
   default look; every rule below assumes it.
2. Reference (only for "Match a reference"): `node ref.mjs <x.com status URL | .mp4 URL | file>`.
   It downloads the video (and the post text, which often holds the creator's full prompt),
   and writes `refs/<name>/sheet.png` (2 frames per second), cuts, shot lengths, palette,
   loudness and a motion audit to `refs/<name>/analysis.md`. Open the sheet and look at it.
   No reference but want one? Browse [whatships.com](https://whatships.com) (a library of Opus 5.5
   videos linking to the original posts) and pick one whose grammar fits the product.
3. Pick the template in [briefs.md](briefs.md): E keynote continuous take (the default `look`),
   F agent / chat product (the user types a request, the product does the work), G inside the
   period (looping; products that work while the user is away), A kinetic launch, B UI morph
   loop, D flagship 45 s+; walkthroughs use E with real app screens. Append C if there's a
   voiceover or mascot. Fill it and save `docs/brief.md`.
4. `docs/style_guide.md`: from `refs/*/analysis.md` if there's a reference, otherwise from
   `assets/brand.json`. Palette in hex, one display face, one UI face, one accent.
   For "Both", define the second look as `THEMES.house` in `index.html`.
5. Beat grid:
   - Synthesized: `node music.mjs --dur <seconds> --bpm 120` → `audio/music.wav` + `audio/beats.json`.
   - Supplied track: `python3 beats.py audio/track.wav > audio/beats.json`.
6. Voiceover: follow [voiceover.md](voiceover.md). Write `vo_script.json` (one line per shot,
   ~2.3 words per second), pick the voice, generate, fix overruns. Shots then start on line times.

## Step 4: Shot list gate (the only other time you stop)

Write `docs/shotlist.md` on the beat grid. Every shot: beat range, what's on screen (naming the
asset file), how it is made out of the previous shot (the transition), camera move, on-screen
text, voice line (if any), SFX cue. Rules: hook in the first 2 s, a change on every beat, no hold
over 1 s, one proof metric, logo + CTA at the end.

Show the shot list compactly (and the voice name, if any) and ask for OK. Apply changes, then
continue without stopping until delivery.

## Step 5: Build

Edit `index.html`: set `DUR`, `BPM`, `THEMES.brand`, `FONTS`, `ASSETS`, then replace the example
`SCENES` (a working 11 s keynote take: wordmark squeezes into its period → dot → pill → click →
flood → 3D UI with headline → camera push → toggle → collapse into the dot → the letters spring
back out of the period, so the last frame equals the first). Scenes get absolute `t`; place every
event with `B(n)` (beat n) and let neighbouring scenes overlap so one hands off to the next.

The kit (`lib/kit.js`) does the Opus 5.5 grammar; use it instead of writing effects from scratch:
- Type: `maskRise` (letters rise out of a line, `out` to leave, `accentLast` for the period),
  `words`, `scramble`, `typeOn` (seeded human keystroke rhythm; put `\n` in the text for fixed
  lines; `typeTimes` gives the same times for key sounds), `slam`, `countUp`, `strike`, `label`,
  `wordmark`, `squeeze` (letters slide into the period; `at: 'dot'` pins the dot).
- UI: `card` (`lift` grows the shadow with height), `pill`, `chip`, `toggle`, `shot` (screenshot
  or sub-rect), `ring`, `cursorPath`, `cursor`, `ripple`, `glass` (blurred backdrop, tint, inner
  edge, rim).
- Camera and depth: `camPath(t, [[time, zoom, x, y], ...])` (one glide per key, zoom in log
  space: the default camera), `camera(zoom, focusX, focusY)`, `plane3d(img, cx, cy, w,
  {rx, ry, rz, blur})` (perspective UI plane), `blurred(px, fn)`.
- Transitions: `morphBox`, `states(t, table)` (one morph table of beat times: size, radius,
  colour), `flood`, `contract` (`area: true` eases by area), `iris` (six real blades, eased by
  area), `portal` (open a dot onto another world), `goo` (split / merge), `mixColor`.
- Timing (lib/motion.js): springs `sp()` for pops and landings, `glide(t, 0.8)` on
  cubic-bezier(.45,0,.15,1) for anything that travels, `keyed()` for multi-key glides.
- Layers: `layerCtx(name)` + `withCtx(ctx, fn)` draw a world offscreen (needs `let g`, not
  `const g`).
- Footage (wall shadows, sunrise, a screen recording): `node prep-footage.mjs in.mov wall` →
  frame sequence; `FOOTAGE = {wall: 'assets/footage/wall'}`; `footage('wall', localT, x, y, w)`.
  Keep `window.seek = seekWith(draw)` so frames load before capture.
- Character: `mascot(x, y, size, t, {look, squash})` (`?mascot=1` in the template).

Use `sp(t, 'snappy'|'base'|'heavy'|'playful')` for entrances and `track()` for anything with
several targets (cursor). Lay out in design units with `DW`, `DH`, `PORTRAIT`, `SQUARE`
so one timeline reframes per format. Ring and click on real boxes from `assets/targets.json`.

Sound cues live in `index.html` next to the events they score: the `CUES` array, synthesized
`{t: B(4), type: 'click'}` (click, pop, thump, whoosh, chime, tick, swish, riser, key) or file SFX
`{t: B(4), file: 'sfx/click.wav', gain: 0.8}`, placed by the file's loudest sample. Every visible
event gets a sound; typed text gets a `key` per letter from `typeTimes`. If the film has
deliberate hard cuts, list their times in `window.CUTS` so motion blur never smears across them.

## Step 6: Critique loop (minimum 3 rounds)

```bash
node render.mjs --w 1920 --h 1080 --stills beats                       # one still per beat, mid-move
node render.mjs --w 1920 --h 1080 --stills beats --query theme=house   # second look, if any
node render.mjs --w 1080 --h 1920 --stills 1,4,8                       # spot-check each other format
```

Open `out/stills/contact.png` with your file/image reading tool and actually look at it. Run the
"Critique pass" from [briefs.md](briefs.md), fix the 3 worst problems, log scores in
`docs/review_log.md`, re-render stills. Stop only when every score is 8+ and at least 3 rounds
are done. For 45 s+ films, render an animatic first: `--w 960 --h 540 --sub 1`.

## Step 7: Render, mix, check

Per format (16:9 `1920x1080`, 9:16 `1080x1920`, 1:1 `1080x1080`) and per theme:

```bash
node render.mjs --verify                                              # same frame in any seek order
node render.mjs --w 1920 --h 1080 --out out/silent_16x9.mp4          # 60 fps, adaptive motion blur
node render.mjs --cues sfx_cues.json                                  # window.CUES -> sfx_cues.json
node sfx.mjs sfx_cues.json out/sfx.wav
./mix.sh out/silent_16x9.mp4 out/final_16x9.mp4 audio/music.wav out/sfx.wav [--voice audio/voice.wav]
./check.sh out/final_16x9.mp4 <seconds-of-fastest-action> [--loop]
```

Drafts and finals stay in the workspace's `out/` until they pass every check below.

`--verify` must pass before the first full render; a mismatch means state is carried between
frames (a cache, a counter, an unseeded random). Motion blur is `--sub auto` by default: each frame
block-matches the two ends of a 180° shutter (`--shutter 0.5`) and spaces samples so nothing moves
more than 3 px between them, up to `--max-sub 32`. Still frames stay single-sample and sharp; fast
moves get as many samples as they need, so there are no ghost copies. `--sub N` forces N samples
(`--sub 1` for animatics). After a fix, re-render only the changed seconds with `--from 12 --to 16`.

Grab the fastest frame from the final MP4 at full resolution (`ffmpeg -ss <t> -i final.mp4
-frames:v 1 out/f.png`) and look at it 1:1: edges should streak, never step.

`check.sh` also runs `motion-audit.mjs`, which prints motion per second and lists every hold
over 1 s, every single-frame pop, dead seconds, (with `--loop`) the seam, and (when
`sfx_cues.json` exists) sound sync: visible events with no sound within 0.12 s, and sounds with
nothing moving. Fix every hold, every pop that isn't a deliberate downbeat cut, and every sync miss. Then open `out/check/contact.png`,
`strip.png` and `phone.png` and run the critique pass on the real render; fix and re-render
anything below 8. With a voiceover, listen-check by reading
`audio/vo_timing.json`: every line must start on its shot and none may overrun.
Confirm loudness: `ffmpeg -i final.mp4 -af ebur128 -f null - 2>&1 | tail -12` shows about -14 LUFS.

## Step 8: Deliver and report cost

Copy only the finished MP4s into ROOT, named `<product>-<format>.mp4` (`acme-16x9.mp4`,
`acme-9x16.mp4`, `acme-house-16x9.mp4` for a second look). If a file with that name is already
there from an earlier version, add `-v2`, `-v3` rather than overwrite it.

```bash
cp out/final_16x9.mp4 "<ROOT>/<product>-16x9.mp4"
node cost-report.mjs --video out/final_16x9.mp4
```

It reads exact token usage from Claude Code or Codex session logs for the user's folder (newest
session; `--all-sessions` for everything), adds the voice API cost from `audio/vo_usage.json`,
prices it with `pricing.json`, and writes `out/cost_report.md`. If no log is found (Cursor and
other IDEs don't expose usage to the agent), ask the user for the numbers on their usage page
and re-run with `--model claude-opus-5-5 --input N --output N --cache-read N --cache-write N`.
Only if they can't, use `--transcript <chat.jsonl>` and call the result a lower-bound estimate.

Then free the space: `node workspace.mjs clean <product>` deletes drafts, renders and
references, and keeps the film's source and the review images (a few MB) so follow-up edits
("change the CTA", "make a 9:16") are a one-line change plus re-render.

Report in this order:
1. The MP4 paths in ROOT; embed `out/check/poster.png` and `out/check/contact.png` inline.
2. One line, filled from the report: **"This N-second video used X tokens and cost about $Y
   (Z per second of video), plus $V for the voiceover."** Mention if it's an estimate, and that
   subscription plans bill differently from API rates.
3. Final critique scores and the 2-3 things you'd improve next.
4. One line: the source is kept in `<WORK>` for edits; `node SKILL_DIR/studio/workspace.mjs
   clean <product> --all` removes it, and `workspace.mjs list` shows every workspace.

## Hard rules

- The user's folder receives only the final MP4s. Everything else lives in the workspace.
- Real product UI only. Never invent screens, features, metrics or testimonials.
- No Math.random, timers, CSS transitions or carried state in render mode.
- Banned: crossfades, blur-ins, glows, particles, 3D flips, holds over 1 s, centered title on
  gradient, everything fading in, corner labels/frame borders.
- References give the grammar, never the content, logos or characters. Don't commit
  downloaded reference videos; link to the creator's post.
- API keys and passwords only in `.env` (`~/.config/product-demo-video/.env` or the user's
  folder); refer to them by variable name; never print them or copy them into the workspace.
- Logged-in apps are read-only: navigate and screenshot, never change data.

## Additional resources

- The Opus 5.5 style research (sources, measured numbers, grammar): [research.md](research.md)
- Brief templates and the critique prompt: [briefs.md](briefs.md)
- Voiceover providers, voices and script timing: [voiceover.md](voiceover.md)
- Studio files copied into each workspace by `workspace.mjs`: `studio/` (render.mjs, lib/motion.js, lib/kit.js,
  capture-*.mjs, ref.mjs, prep-footage.mjs, motion-audit.mjs, doctor.mjs, voiceover.mjs, music.mjs, sfx.mjs,
  beats.py, mix.sh, check.sh, cost-report.mjs, pricing.json, house-rules.md, index.html, env.example)
- Method source: [How to build motion design studio with Opus 5.5](https://x.com/0xMovez/status/2104216919033192746)
