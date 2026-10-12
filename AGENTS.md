# Agents

This repo is a portable agent skill. If the user asks for a product demo, launch, promo or
walkthrough video, read `skills/product-demo-video/SKILL.md` and follow it step by step.
`SKILL_DIR` in that file means `skills/product-demo-video` in this repo.

When you edit the skill itself:
- Keep `SKILL.md` agent-neutral: say "ask" (structured question tool if available, numbered
  options otherwise), not a tool name from one product. Keep its `description` under 1024
  characters (the Agent Skills limit).
- Studio scripts must stay dependency-free apart from Playwright and ffmpeg.
- Never commit keys, `.env`, `.auth.json`, rendered videos, audio, or downloaded reference
  videos and frames (link to the creator's post instead).
- Run `./tests/smoke.sh` before pushing.

Releasing: bump `version` in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`,
`.cursor-plugin/plugin.json`, `.codex-plugin/plugin.json` and `gemini-extension.json` together
(CI checks they match), then push a `vX.Y.Z` tag. The release workflow attaches
`product-demo-video.zip` for Claude.ai and other skill uploaders.
