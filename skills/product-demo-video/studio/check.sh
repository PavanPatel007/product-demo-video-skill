#!/usr/bin/env bash
# usage: ./check.sh <video.mp4> [strip_start_seconds] [--loop] [--max-hold 2]
# Writes images the agent must open and look at (contact sheet, motion strip, phone-size test,
# poster) and runs the motion audit (holds over 1 s, single-frame pops, flashes, loop seam).
set -euo pipefail
v=$1 s=${2:-2} d=out/check
case "$s" in --*) s=2 ;; esac
loop="" hold=""; prev=""
for a in "$@"; do
  [ "$a" = "--loop" ] && loop="--loop"
  [ "$prev" = "--max-hold" ] && hold="--max-hold $a"
  prev=$a
done
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$d"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v")
fps=$(awk -v d="$dur" 'BEGIN { printf "%.4f", 30 / d }')

ffmpeg -y -loglevel error -i "$v" -vf "fps=$fps,scale=270:-1,tile=6x5:padding=6:color=white" -frames:v 1 "$d/contact.png"
ffmpeg -y -loglevel error -ss "$s" -i "$v" -vf "fps=20,scale=320:-1,tile=12x1" -frames:v 1 "$d/strip.png"
ffmpeg -y -loglevel error -i "$v" -vf "fps=1,scale=360:-1,tile=5x3" -frames:v 1 "$d/phone.png"
ffmpeg -y -loglevel error -ss "$(awk -v d="$dur" 'BEGIN { print d / 3 }')" -i "$v" -frames:v 1 "$d/poster.png"
echo "wrote $d/{contact,strip,phone,poster}.png (duration ${dur}s)"
cues=""; [ -f sfx_cues.json ] && cues="--cues sfx_cues.json"
node "$here/motion-audit.mjs" "$v" --out "$d" $loop $hold $cues || true
