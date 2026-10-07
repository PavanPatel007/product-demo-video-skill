#!/usr/bin/env bash
# End-to-end check of the studio: scaffold → doctor → music → stills (beats, 2 themes, 3 formats,
# mascot) → render → sfx (synth + file cue) → voiceover (local + missing-key path) → mix with
# ducking → loudness → check + motion audit → ref.mjs → cost report (Claude fixture, Codex
# fixture, manual). Uses a temp folder; leaves nothing behind.
set -euo pipefail
repo="$(cd "$(dirname "$0")/.." && pwd)"
studio="$repo/skills/product-demo-video/studio"
fx="$repo/tests/fixtures"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
pass=0
ok() { pass=$((pass + 1)); echo "  ✓ $*"; }
fail() { echo "  ✗ $*"; exit 1; }
step() { echo "• $*"; }

step "syntax"
for f in "$studio"/*.mjs "$studio"/lib/*.mjs "$studio"/lib/*.js; do node --check "$f" || fail "$f"; done
for f in "$studio"/*.sh "$repo"/install.sh; do bash -n "$f" || fail "$f"; done
ok "all scripts parse"

step "scaffold"
cd "$tmp"
cp -R "$studio/." .
chmod +x mix.sh check.sh
mkdir -p assets/screens audio docs out
if [ -n "${SMOKE_NODE_MODULES:-}" ]; then ln -s "$SMOKE_NODE_MODULES" node_modules; else npm i --silent --no-audit --no-fund >/dev/null; fi
npx playwright install chromium >/dev/null
ok "studio copied, deps installed"

step "doctor"
ELEVENLABS_API_KEY= node doctor.mjs >doctor.txt || { cat doctor.txt; fail "doctor reports a missing required tool"; }
awk '/Voiceover providers/{getline; print; exit}' doctor.txt | grep -q "ElevenLabs (recommended)" || fail "ElevenLabs not listed first"
grep -q "add ELEVENLABS_API_KEY to .env" doctor.txt || fail "missing key not explained by name"
! grep -q "sk-\|xi-" doctor.txt || fail "doctor printed something that looks like a key"
ok "toolchain ready, voice providers listed with ElevenLabs first"

step "music + beats"
node music.mjs --dur 11 --bpm 120 >/dev/null
[ -s audio/music.wav ] && [ -s audio/beats.json ] || fail "music.mjs outputs missing"
ok "audio/music.wav + beats.json"

step "stills"
node render.mjs --w 1920 --h 1080 --stills beats >/dev/null
n=$(ls out/stills/*_t*.png | wc -l | tr -d ' ')
[ "$n" -ge 20 ] && [ -s out/stills/contact.png ] || fail "--stills beats wrote $n stills, expected one per beat (22)"
node render.mjs --w 1920 --h 1080 --stills 1,4,8 --query theme=house >/dev/null
[ -s out/stills/contact.png ] || fail "house theme stills missing"
node render.mjs --w 1080 --h 1920 --stills 1,4,8 >/dev/null
[ -s out/stills/contact.png ] || fail "9:16 stills missing"
node render.mjs --w 1080 --h 1080 --stills 3,10.5 --query mascot=1 >/dev/null
[ -s out/stills/contact.png ] || fail "1:1 mascot stills missing"
ok "$n beat stills; brand + house themes; 16:9, 9:16, 1:1 with mascot"

step "render"
node render.mjs --w 960 --h 540 --fps 30 --sub 1 --out out/silent.mp4 >/dev/null 2>&1
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/silent.mp4)
awk -v d="$d" 'BEGIN { exit !(d > 10.8 && d < 11.2) }' || fail "silent.mp4 is ${d}s, expected 11"
ok "out/silent.mp4 (${d}s)"

step "sfx"
mkdir -p sfx && ffmpeg -y -loglevel error -f lavfi -i "sine=f=900:d=0.4" -af "afade=t=in:d=0.15,afade=t=out:st=0.2:d=0.2" sfx/tone.wav
echo '[{"t":0.2,"type":"whoosh"},{"t":1.75,"type":"click"},{"t":2.0,"type":"swish"},{"t":4.0,"type":"tick"},{"t":6.0,"file":"sfx/tone.wav","gain":0.7},{"t":7.25,"type":"riser"},{"t":8.0,"type":"pop"},{"t":9.0,"type":"chime","gain":0.6}]' >sfx_cues.json
node sfx.mjs sfx_cues.json out/sfx.wav >/dev/null
[ -s out/sfx.wav ] || fail "sfx.wav missing"
ok "out/sfx.wav (synthesized cues + a file cue placed by its peak)"

step "voiceover"
echo '[{"t":0.3,"text":"Stop losing leads."},{"t":3.0,"text":"Every lead lands in one inbox."},{"t":7.2,"text":"Try it free."}]' >vo_script.json
out=$(ELEVENLABS_API_KEY= node voiceover.mjs say --provider elevenlabs --voice x 2>&1) && fail "elevenlabs ran without a key"
echo "$out" | grep -q "ELEVENLABS_API_KEY" || fail "missing-key message doesn't name ELEVENLABS_API_KEY"
ok "missing ElevenLabs key → clear message naming the variable"
voiced=0
if command -v say >/dev/null || command -v espeak-ng >/dev/null; then
  node voiceover.mjs say --provider local --script vo_script.json --dur 11 >/dev/null || [ $? -eq 2 ]
  [ -s audio/voice.wav ] && [ -s audio/vo_timing.json ] && [ -s audio/vo_usage.json ] || fail "local voiceover outputs missing"
  grep -q '"characters": 60' audio/vo_usage.json || fail "vo_usage character count wrong: $(cat audio/vo_usage.json)"
  voiced=1
  ok "local voice → audio/voice.wav, vo_timing.json, vo_usage.json"
else
  echo "  – no say/espeak-ng; skipping local voice"
fi

step "mix"
if [ $voiced = 1 ]; then ./mix.sh out/silent.mp4 out/final.mp4 audio/music.wav out/sfx.wav --voice audio/voice.wav >/dev/null
else ./mix.sh out/silent.mp4 out/final.mp4 audio/music.wav out/sfx.wav >/dev/null; fi
lufs=$(ffmpeg -nostats -i out/final.mp4 -af ebur128 -f null - 2>&1 | awk '/Integrated loudness/{f=1} f && /I:/{print $2; exit}')
awk -v l="$lufs" 'BEGIN { exit !(l > -15.5 && l < -12.5) }' || fail "loudness $lufs LUFS, expected about -14"
ok "out/final.mp4 at $lufs LUFS$([ $voiced = 1 ] && echo ', music ducked under voice')"

step "check"
./check.sh out/final.mp4 3 >/dev/null
for f in contact strip phone poster; do [ -s "out/check/$f.png" ] || fail "check.sh: $f.png missing"; done
[ -s out/check/motion.txt ] && [ -s out/check/motion.json ] || fail "check.sh: motion audit missing"
grep -q "holds: none" out/check/motion.txt || { cat out/check/motion.txt; fail "template has a hold over 1 s"; }
ok "contact, strip, phone, poster; motion audit finds no holds in the template"

step "reference analysis"
node ref.mjs out/final.mp4 --name smoke >/dev/null
[ -s refs/smoke/sheet.png ] && [ -s refs/smoke/analysis.md ] || fail "ref.mjs outputs missing"
grep -q "Hard cuts: none" refs/smoke/analysis.md || { cat refs/smoke/analysis.md; fail "template should read as one continuous take"; }
grep -q "LUFS" refs/smoke/analysis.md || fail "ref.mjs loudness missing"
ok "ref.mjs: sheet, cuts (continuous take), loudness, motion"

step "cost report"
r=$(node cost-report.mjs --video out/final.mp4 --source claude --claude-dir "$fx/claude")
echo "$r" | grep -q "Claude Code logs" || fail "claude source not used"
echo "$r" | grep -q "174,500 tokens" || { echo "$r"; fail "claude token total wrong"; }
echo "$r" | grep -q '\$0.211' || { echo "$r"; fail "claude cost wrong (expected \$0.211)"; }
echo "$r" | grep -q "11-second video" || fail "video length missing"
[ $voiced = 1 ] && { echo "$r" | grep -q "Voiceover (local)" || fail "voice cost line missing"; }
ok "Claude Code fixture: 174,500 tokens, \$0.211, deduped, 11-second video"

mkdir -p codex/2026/10/07
sed "s#__CWD__#$(pwd)#g" "$fx/codex/rollout-template.jsonl" >codex/2026/10/07/rollout-1.jsonl
r=$(node cost-report.mjs --seconds 10 --source codex --codex-dir codex)
echo "$r" | grep -q "Codex logs" || { echo "$r"; fail "codex source not used"; }
echo "$r" | grep -q "206,000 tokens" || { echo "$r"; fail "codex token total wrong"; }
ok "Codex fixture: last cumulative count, filtered by project folder"

r=$(node cost-report.mjs --seconds 56 --model claude-opus-5-5 --input 1000000 --output 100000 --cache-read 2000000)
echo "$r" | grep -q '\$6.40' || { echo "$r"; fail "manual cost wrong (expected \$6.40 + voice)"; }
ok "manual dashboard numbers: 1M in / 100k out / 2M cache read = \$6.40 on Opus 5.5"

r=$(HOME="$tmp/nohome" node cost-report.mjs --seconds 10 --source claude || true)
echo "$r" | grep -q "none found" || fail "no-log case should ask for dashboard numbers"
ok "no logs → asks for usage-page numbers"

echo
echo "smoke test passed: $pass checks"
