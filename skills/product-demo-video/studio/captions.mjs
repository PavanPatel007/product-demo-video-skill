// Captions from the voiceover timing.
//
//   node captions.mjs [--timing audio/vo_timing.json] [--out out/captions.srt] [--chars 42]
//   node captions.mjs --mux out/final_16x9.mp4      also add the captions as a soft subtitle track (in place)
//
// Each spoken line becomes one or more cues of at most 2 lines x --chars characters, timed in
// proportion to their length across the line's real start and end in vo_timing.json.
// The .srt goes to the user's folder next to the MP4s (X, LinkedIn and YouTube take it as an upload).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { arg } from './lib/env.mjs';

const timingFile = arg('timing', 'audio/vo_timing.json');
const out = arg('out', 'out/captions.srt');
const maxChars = Number(arg('chars', 42));
const mux = arg('mux', '');

if (!existsSync(timingFile)) {
  console.log(`${timingFile} not found: captions come from the voiceover (node voiceover.mjs say ...)`);
  process.exit(1);
}

function wrap(words) {
  const lines = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + w).length <= maxChars) lines[lines.length - 1] = last + ' ' + w;
    else lines.push(w);
  }
  return lines;
}

const stamp = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

const cues = [];
for (const line of JSON.parse(readFileSync(timingFile, 'utf8'))) {
  const rows = wrap(line.text.trim().split(/\s+/));
  const blocks = [];
  for (let i = 0; i < rows.length; i += 2) blocks.push(rows.slice(i, i + 2).join('\n'));
  const total = blocks.reduce((a, b) => a + b.length, 0);
  let t = line.t;
  for (const b of blocks) {
    const end = t + (line.end - line.t) * (b.length / total);
    cues.push({ from: t, to: end, text: b });
    t = end;
  }
}

const srt = cues.map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c.text}\n`).join('\n');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, srt);
const long = cues.filter((c) => c.text.split('\n').some((r) => r.length > maxChars));
console.log(`wrote ${out} (${cues.length} cues)`);
for (const c of long) console.log(`  one word is longer than ${maxChars} characters at ${c.from.toFixed(2)}s: "${c.text}"`);

if (mux) {
  const tmp = mux.replace(/\.mp4$/, '') + '.captioned.mp4';
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', mux, '-i', out, '-map', '0', '-map', '1', '-c', 'copy', '-c:s', 'mov_text',
    '-metadata:s:s:0', 'language=' + arg('lang', 'eng'), tmp]);
  renameSync(tmp, mux);
  console.log(`added the captions to ${mux} as a subtitle track`);
}
