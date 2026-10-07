# Product Demo Video skill

An agent skill that turns a product URL into a polished demo video, rendered from code.
It is tuned for **Claude Opus 5.5** and works with any agent that can run shell commands:
Claude Code, Cursor, Codex, and others.

How a run goes:

1. **Model check.** If you're not on Claude Opus 5.5, you get a gentle reminder and how to
   switch, then you choose to switch or continue.
2. **A few questions.** Style, length, formats, music, look, mascot, and an optional
   **AI voiceover**. Voiceover providers are listed in this order: ElevenLabs (recommended),
   OpenAI, Google Cloud, Azure, or a free local voice. Each one is marked by whether its API
   key is already in `.env`.
3. **Real assets.** It screenshots your site and app, including logged-in pages (read-only),
   and pulls brand colors, fonts and logo.
4. **Shot list on a beat grid.** You approve it once. After that it works without stopping.
5. **Build and self-critique.** A deterministic `window.seek(t)` canvas animation in the style
   of the viral Opus 5.5 videos (see below). It renders one still per beat, looks at them,
   scores 1-10, fixes the 3 worst problems, and repeats until every score is 8+. A motion audit
   then checks the real render for frozen moments and single-frame pops.
6. **Render.** 60 fps H.264 in 16:9, 9:16 and 1:1. Synthesized music, UI sound effects and
   voice are mixed to -14 LUFS, and the music ducks under narration.
7. **Cost report.** For example: *"This 56-second video used 3.1M tokens and cost about $9.40,
   plus $0.18 for the voiceover."*

The method comes from
[How to build motion design studio with Opus 5.5](https://x.com/0xMovez/status/2104216919033192746).

## The look

The default look is a study of the most-shared Opus 5.5 videos (for example
[zero's keynote film](https://x.com/twoclipping/status/2103835273813496100),
[Leon Lin's calendar launch](https://x.com/LexnLin/status/2104148233106723099) and
[Kenn Ejima's showreel](https://x.com/kenn/status/2103337314021937232)), measured frame by
frame. The full notes are in [`research.md`](skills/product-demo-video/research.md).

- **One continuous take.** No crossfades: a dot becomes a pill, a pill floods the frame, the
  flood contracts onto the product, and the scene collapses back into the dot that becomes the
  wordmark's period.
- **Camera.** Screen-studio zooms toward the cursor, with the real UI on a 3D plane that
  straightens as the camera pushes in, and depth blur behind a sharp focus card.
- **Type.** Letters rise out of a mask line, plus scramble/decode, typed text, word slams,
  count-ups and strike-throughs.
- **Pacing.** Something changes on every beat, and nothing holds longer than 1 s.
- **Character.** An optional box mascot with squash and stretch, blinks, and eyes that follow
  the cursor.
- **Reference matching.** `ref.mjs` analyzes any video or X post: contact sheet, cuts, palette,
  loudness, motion, and the creator's prompt if the post has one.

## Install

```bash
git clone https://github.com/PavanPatel007/product-demo-video-skill.git
cd product-demo-video-skill
./install.sh            # copies the skill into every agent skills folder it finds
```

Or install by hand by copying `skills/product-demo-video` into your agent's skills folder:

| Agent | Skills folder |
|---|---|
| Claude Code | `~/.claude/skills/` (or `.claude/skills/` in a project) |
| Cursor | `~/.cursor/skills/` |
| Codex CLI | `~/.codex/skills/` |
| `npx skills` | `npx skills add PavanPatel007/product-demo-video-skill` |
| Anything else | Point the agent at `skills/product-demo-video/SKILL.md`; `AGENTS.md` explains it |

Requirements are Node 18+, ffmpeg, and Chromium for Playwright (the skill installs Playwright
per project). Python with librosa is only needed if you bring your own music track.

## Use

Ask your agent:

> Make a 30-second launch video for https://yourproduct.com

or name the skill: *"Use the product-demo-video skill for https://yourproduct.com"*.

## Voiceover keys

Put keys in `.env` in the video project folder. Never paste them into chat.
See [`studio/env.example`](skills/product-demo-video/studio/env.example).

| Provider | Key |
|---|---|
| ElevenLabs (recommended) | `ELEVENLABS_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| Google Cloud TTS | `GOOGLE_TTS_API_KEY` |
| Azure AI Speech | `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` |
| Local (`say` / `espeak-ng`) | none |

## Cost report

`cost-report.mjs` gets token counts from the first source it finds:

- **Claude Code and Codex:** exact counts, read from their local session logs for the project folder.
- **Cursor and other IDEs:** these don't expose usage to the agent, so the skill asks you for
  the numbers from your usage page.
- **Last resort:** a clearly labeled lower-bound estimate.

Prices are in [`pricing.json`](skills/product-demo-video/studio/pricing.json), which you can
edit. Claude Opus 5.5 is $4 per million input tokens and $20 per million output tokens; cache
reads are $0.20 per million. Subscription plans bill differently, so the report shows the
pay-as-you-go API equivalent.

## What's inside

```
skills/product-demo-video/
  SKILL.md            the workflow the agent follows
  research.md         the Opus 5.5 style: sources, measurements, grammar
  briefs.md           prompt templates + critique pass
  voiceover.md        providers, voice choice, script timing
  studio/             copied into each video project
    render.mjs        seek(t) → frames → ffmpeg (--stills beats for one still per beat)
    index.html        11 s keynote-take template, themes, design space
    lib/motion.js     springs, track(), seeded rng
    lib/kit.js        mask-rise type, scramble, count-up, 3D UI plane, camera, flood, iris, mascot
    ref.mjs           analyze a reference video or X post
    motion-audit.mjs  holds, single-frame pops, dead seconds, loop seam
    capture-*.mjs     site/app/component screenshots, brand.json
    probe-targets.mjs CSS boxes for cursor/ring targets
    doctor.mjs        toolchain + voice key check (names only)
    voiceover.mjs     ElevenLabs / OpenAI / Google / Azure / local TTS
    music.mjs sfx.mjs synthesized score + UI sounds, or your SFX files placed by their peak
    beats.py          beat grid for a supplied track
    mix.sh            ducking + -14 LUFS two-pass loudnorm
    check.sh          contact sheet, motion strip, phone test, poster, motion audit
    cost-report.mjs   tokens + $ per video
tests/smoke.sh        end-to-end check of the whole pipeline
```

## Test

```bash
./tests/smoke.sh      # scaffolds a temp project and runs every stage, ~1-2 minutes
```
