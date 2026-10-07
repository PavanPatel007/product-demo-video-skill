// node music.mjs --dur 20 --bpm 120 --out audio/music.wav --beats audio/beats.json
// Deterministic synthesized score (kick, hats, bass, pad) plus the beat grid the animation reads.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const raw = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const DUR = Number(raw('dur', 20)), BPM = Number(raw('bpm', 120));
const OUT = raw('out', 'audio/music.wav'), BEATS = raw('beats', 'audio/beats.json');
const SR = 48000, BEAT = 60 / BPM, N = Math.ceil(DUR * SR);
const buf = new Float32Array(N);

let seed = 7; const noise = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2147483648 - 1;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const add = (t0, len, fn) => {
  const s = Math.floor(t0 * SR);
  for (let i = 0; i < len * SR && s + i < N; i++) buf[s + i] += fn(i / SR);
};

const CHORDS = [[57, 60, 64], [53, 57, 60], [55, 60, 64], [55, 59, 62]];   // Am F C G, one bar each
const beats = [];
for (let b = 0; b * BEAT < DUR; b++) {
  const t = b * BEAT, bar = Math.floor(b / 4), chord = CHORDS[bar % 4];
  beats.push(+t.toFixed(3));

  if (bar > 0 || b % 4 === 0)
    add(t, 0.45, (x) => Math.sin(2 * Math.PI * (45 * x + 75 * (1 - Math.exp(-x * 30)) / 30)) * Math.exp(-x * 8) * 0.8);
  if (bar > 0) add(t + BEAT / 2, 0.08, (x) => (noise() - noise()) * Math.exp(-x * 70) * 0.12);
  if (b % 2 === 0) {
    const f = hz(chord[0] - 24);
    add(t, BEAT * 1.8, (x) => (Math.sin(2 * Math.PI * f * x) + 0.3 * Math.sin(4 * Math.PI * f * x)) *
      Math.min(1, x * 200) * Math.exp(-x * 2.5) * 0.28);
  }
  if (b % 4 === 0) {
    for (const m of chord) {
      const f = hz(m);
      add(t, BEAT * 4, (x) => {
        let v = 0;
        for (let h = 1; h <= 4; h++) v += Math.sin(2 * Math.PI * f * h * x * (1 + 0.002 * h)) / h;
        return v * Math.min(1, x / 0.25) * Math.min(1, (BEAT * 4 - x) / 0.2) * 0.05;
      });
    }
  }
}

const fadeOut = Math.min(1.5, DUR / 4);
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  buf[i] *= Math.min(1, t / 0.01) * Math.min(1, (DUR - t) / fadeOut);
  peak = Math.max(peak, Math.abs(buf[i]));
}
const gain = peak > 0 ? 0.9 / peak : 1;

const b = Buffer.alloc(44 + N * 2);                      // 16-bit mono WAV
b.write('RIFF', 0); b.writeUInt32LE(36 + N * 2, 4); b.write('WAVEfmt ', 8);
b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
b.write('data', 36); b.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i] * gain)) * 32767), 44 + i * 2);

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, b);
const downbeats = beats.filter((_, i) => i % 4 === 0);
writeFileSync(BEATS, JSON.stringify({ bpm: BPM, beats, downbeats, hits: downbeats }, null, 1));
console.log(`wrote ${OUT} (${DUR}s @ ${BPM} BPM) and ${BEATS}`);
