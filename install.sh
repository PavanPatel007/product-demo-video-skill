#!/usr/bin/env bash
# Copies the skill into each agent skills folder that exists (or the ones you name).
#   ./install.sh                 auto: ~/.claude ~/.cursor ~/.codex ~/.agents (if present)
#   ./install.sh ~/.cursor       just that agent home
set -euo pipefail
src="$(cd "$(dirname "$0")" && pwd)/skills/product-demo-video"
homes=("$@")
if [ ${#homes[@]} -eq 0 ]; then
  for h in "$HOME/.claude" "$HOME/.cursor" "$HOME/.codex" "$HOME/.agents"; do [ -d "$h" ] && homes+=("$h"); done
fi
[ ${#homes[@]} -gt 0 ] || { echo "No agent folders found. Pass one: ./install.sh ~/.claude"; exit 1; }
for h in "${homes[@]}"; do
  dest="$h/skills/product-demo-video"
  mkdir -p "$h/skills"
  rm -rf "$dest"
  cp -R "$src" "$dest"
  chmod +x "$dest/studio/mix.sh" "$dest/studio/check.sh"
  echo "installed → $dest"
done
command -v ffmpeg >/dev/null || echo "note: ffmpeg not found (brew install ffmpeg | apt install ffmpeg)"
node -e 'process.exit(+process.versions.node.split(".")[0] >= 18 ? 0 : 1)' 2>/dev/null || echo "note: Node 18+ required"
