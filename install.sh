#!/usr/bin/env bash
# Installs the product-demo-video skill into every agent skills folder it finds (or the ones you name).
#   curl -fsSL https://raw.githubusercontent.com/PavanPatel007/product-demo-video-skill/main/install.sh | bash
#   ./install.sh                 from a clone: every agent found below
#   ./install.sh ~/.cursor       just that agent home (installs into <home>/skills)
# Re-run to update; it replaces the installed copy.
set -euo pipefail
repo="https://github.com/PavanPatel007/product-demo-video-skill"
name="product-demo-video"

here="$(cd "$(dirname "${BASH_SOURCE[0]:-.}")" 2>/dev/null && pwd || true)"
if [ -n "$here" ] && [ -f "$here/skills/$name/SKILL.md" ]; then
  src="$here/skills/$name"
else
  command -v git >/dev/null || { echo "git is required (or download the zip from $repo/releases)"; exit 1; }
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  git clone --depth 1 --quiet "$repo" "$tmp/repo"
  src="$tmp/repo/skills/$name"
fi

# agent home -> its skills folder. ~/.agents/skills is the shared folder Codex and others read.
targets=()
if [ $# -gt 0 ]; then
  for h in "$@"; do targets+=("${h%/}/skills"); done
else
  for pair in \
    "$HOME/.claude|$HOME/.claude/skills" \
    "$HOME/.cursor|$HOME/.cursor/skills" \
    "$HOME/.codex|$HOME/.codex/skills" \
    "$HOME/.agents|$HOME/.agents/skills" \
    "$HOME/.gemini|$HOME/.gemini/skills" \
    "$HOME/.copilot|$HOME/.copilot/skills" \
    "$HOME/.config/opencode|$HOME/.config/opencode/skills"; do
    [ -d "${pair%%|*}" ] && targets+=("${pair#*|}")
  done
fi
[ ${#targets[@]} -gt 0 ] || { echo "No agent folders found. Pass one: ./install.sh ~/.claude"; exit 1; }

for dir in "${targets[@]}"; do
  dest="$dir/$name"
  mkdir -p "$dir"
  rm -rf "$dest"
  cp -R "$src" "$dest"
  chmod +x "$dest/studio/mix.sh" "$dest/studio/check.sh"
  echo "installed → $dest"
done

command -v ffmpeg >/dev/null || echo "note: ffmpeg not found (brew install ffmpeg | apt install ffmpeg | winget install ffmpeg)"
node -e 'process.exit(+process.versions.node.split(".")[0] >= 18 ? 0 : 1)' 2>/dev/null || echo "note: Node 18+ required (https://nodejs.org)"
echo "Done. Ask your agent: \"Make a 30-second launch video for https://yourproduct.com\""
