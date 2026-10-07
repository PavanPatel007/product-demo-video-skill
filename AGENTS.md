# Agents

This repo is a portable agent skill. If the user asks for a product demo, launch, promo or
walkthrough video, read `skills/product-demo-video/SKILL.md` and follow it step by step.
`SKILL_DIR` in that file means `skills/product-demo-video` in this repo.

When you edit the skill itself:
- Keep `SKILL.md` agent-neutral: say "ask" (structured question tool if available, numbered
  options otherwise), not a tool name from one product.
- Studio scripts must stay dependency-free apart from Playwright and ffmpeg.
- Never commit keys, `.env`, `.auth.json`, rendered videos or audio.
- Run `./tests/smoke.sh` before pushing.
