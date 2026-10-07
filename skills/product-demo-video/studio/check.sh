#!/usr/bin/env bash
# usage: ./check.sh <video.mp4> [strip_start_seconds]
# Writes images the agent must open and look at: contact sheet, motion strip, phone-size test, loop seam.
set -euo pipefail
v=$1 s=${2:-2} d=out/check
mkdir -p "$d"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$v")
fps=$(awk -v d="$dur" 'BEGIN { printf "%.4f", 30 / d }')

ffmpeg -y -loglevel error -i "$v" -vf "fps=$fps,scale=270:-1,tile=6x5:padding=6:color=white" -frames:v 1 "$d/contact.png"
ffmpeg -y -loglevel error -ss "$s" -i "$v" -vf "scale=320:-1,tile=12x1" -frames:v 1 "$d/strip.png"
ffmpeg -y -loglevel error -i "$v" -vf "fps=1,scale=360:-1,tile=5x3" -frames:v 1 "$d/phone.png"
ffmpeg -y -loglevel error -stream_loop 1 -i "$v" -c copy "$d/loop_check.mp4"
ffmpeg -y -loglevel error -ss "$(awk -v d="$dur" 'BEGIN { print d / 3 }')" -i "$v" -frames:v 1 "$d/poster.png"
echo "wrote $d/{contact,strip,phone,poster}.png and $d/loop_check.mp4 (duration ${dur}s)"
