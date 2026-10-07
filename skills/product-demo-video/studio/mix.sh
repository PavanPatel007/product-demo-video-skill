#!/usr/bin/env bash
# usage: ./mix.sh <silent.mp4> <final.mp4> <music.wav> [sfx.wav ...] [--voice voice.wav]
# Music sets the length. With --voice, music ducks under the narration (sidechain).
# Two-pass loudness normalization to -14 LUFS, true peak -1 dB.
set -euo pipefail
video=$1 out=$2; shift 2
voice=""
files=()
while [ $# -gt 0 ]; do
  case "$1" in
    --voice) voice=$2; shift 2 ;;
    *) files+=("$1"); shift ;;
  esac
done
[ ${#files[@]} -ge 1 ] || { echo "need at least a music file"; exit 1; }

inputs=() i=1
for a in "${files[@]}"; do inputs+=(-i "$a"); i=$((i + 1)); done
n=${#files[@]}
if [ -n "$voice" ]; then
  inputs+=(-i "$voice"); v=$i
  others=""
  for ((k = 2; k <= n; k++)); do others+="[$k:a]"; done
  graph="[$v:a]asplit=2[vkey][vmix];[1:a][vkey]sidechaincompress=threshold=0.05:ratio=4:attack=15:release=350[duck];[duck]${others}[vmix]amix=inputs=$((n + 1)):duration=first:normalize=0"
else
  labels=""
  for ((k = 1; k <= n; k++)); do labels+="[$k:a]"; done
  graph="${labels}amix=inputs=$n:duration=first:normalize=0"
fi
graph+=",acompressor=threshold=0.1:ratio=4:attack=5:release=120:makeup=2"
target="I=-14:TP=-1:LRA=11"

stats=$(ffmpeg -hide_banner -nostats -i "$video" "${inputs[@]}" \
  -filter_complex "${graph},loudnorm=${target}:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
m() { echo "$stats" | sed -n "s/.*\"$1\" : \"\(.*\)\".*/\1/p"; }

ffmpeg -y -loglevel error -i "$video" "${inputs[@]}" \
  -filter_complex "${graph},loudnorm=${target}:measured_I=$(m input_i):measured_TP=$(m input_tp):measured_LRA=$(m input_lra):measured_thresh=$(m input_thresh):offset=$(m target_offset):linear=true[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest "$out"
echo "wrote $out"
