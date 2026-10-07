// node sfx.mjs cues.json out/sfx.wav
// cues: [{"t":0.5,"type":"click"}, {"t":2.0,"file":"sfx/whoosh.wav","gain":0.7}, ...]
// Synthesized types: click, pop, thump, whoosh, chime, tick, swish, riser.
// File cues (e.g. Mixkit SFX you're licensed to use) are placed so their loudest
// sample lands exactly on t; add "align":"start" to place the file's start instead.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const SR = 48000, cues = JSON.parse(readFileSync(process.argv[2], 'utf8'));

let s = 42; const noise = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2147483648 - 1;
const VOICES = {
  click: [0.05, (t) => Math.sin(2 * Math.PI * 1800 * t) * Math.exp(-t * 90) * 0.5],
  tick: [0.03, (t) => Math.sin(2 * Math.PI * 3200 * t) * Math.exp(-t * 160) * 0.35],
  pop: [0.15, (t) => Math.sin(2 * Math.PI * (600 + 900 * t) * t) * Math.exp(-t * 30) * 0.4],
  thump: [0.5, (t) => Math.sin(2 * Math.PI * (90 - 60 * t) * t) * Math.exp(-t * 9) * 0.9],
  whoosh: [0.35, (t) => noise() * Math.sin(Math.PI * Math.min(1, t / 0.35)) * 0.25],
  swish: [0.18, (t) => noise() * Math.sin(Math.PI * Math.min(1, t / 0.18)) * 0.3 * (1 - t / 0.18)],
  chime: [0.8, (t) => (Math.sin(2 * Math.PI * 1318.5 * t) + 0.6 * Math.sin(2 * Math.PI * 1975.5 * t)) * Math.exp(-t * 6) * 0.25],
  riser: [1.0, (t) => noise() * Math.pow(t, 2) * 0.35 + Math.sin(2 * Math.PI * (200 + 600 * t * t) * t) * t * 0.12],
};

const files = new Map();
function load(file) {
  if (!files.has(file)) {
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 });
    const pcm = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
    let peak = 0; for (let i = 1; i < pcm.length; i++) if (Math.abs(pcm[i]) > Math.abs(pcm[peak])) peak = i;
    files.set(file, { pcm, peak });
  }
  return files.get(file);
}

const len = (c) => (c.file ? load(c.file).pcm.length / SR : VOICES[c.type]?.[0] ?? 0);
const buf = new Float32Array(Math.ceil((Math.max(...cues.map((c) => c.t + len(c))) + 1) * SR));
for (const c of cues) {
  const gain = c.gain ?? 1;
  if (c.file) {
    const { pcm, peak } = load(c.file);
    const start = Math.round(c.t * SR) - (c.align === 'start' ? 0 : peak);
    for (let i = Math.max(0, -start); i < pcm.length && start + i < buf.length; i++) buf[start + i] += pcm[i] * gain;
    continue;
  }
  if (!VOICES[c.type]) throw new Error(`unknown sfx type "${c.type}" (use ${Object.keys(VOICES).join(', ')} or "file")`);
  const [dur, fn] = VOICES[c.type], start = Math.floor(c.t * SR);
  for (let i = 0; i < dur * SR && start + i < buf.length; i++) buf[start + i] += fn(i / SR) * gain;
}

const n = buf.length, b = Buffer.alloc(44 + n * 2);      // 16-bit mono WAV
b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8);
b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
b.write('data', 36); b.writeUInt32LE(n * 2, 40);
for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2);
writeFileSync(process.argv[3], b);
console.log(`wrote ${process.argv[3]} (${cues.length} cues${files.size ? `, ${files.size} sound files` : ''})`);
