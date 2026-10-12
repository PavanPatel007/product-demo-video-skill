// node motion-audit.mjs <video.mp4> [--max-hold 1] [--end-hold 2.5] [--loop] [--out out/check]
// Frame-difference scan of a render (or a reference). Flags what the top Opus 5.5 films never do:
//   holds  : nothing moves for longer than --max-hold seconds (end card allowed --end-hold)
//   pops   : one frame changes far more than its neighbours (hard cut, an element jumping, or
//            footage at half the frame rate, which shows as pops on alternate frames)
//   seam   : with --loop, how different the last frame is from the first
//   sync   : with --cues, visible events with no sound and sounds with nothing moving
// Prints a per-second motion bar and writes <out>/motion.txt + motion.json.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { maxBuffer: 1 << 28 });
const probe = (file) => {
  const [rate, dur] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=r_frame_rate:format=duration',
    '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' }).trim().split('\n');
  const [a, b] = rate.split('/').map(Number);
  return { fps: a / (b || 1), dur: Number(dur) };
};

// Sound sync: an onset is a frame where motion jumps well above the frames just before it (a click
// landing, a pop, a flood starting). Each should have a cue within `win` seconds, and each cue
// should have visible change around it. Advisory: it lists times to look at, it doesn't fail.
function soundSync(d, fps, cues, { win = 0.12 } = {}) {
  const onsets = [];
  for (let i = 6; i < d.length; i++) {
    const before = d.slice(i - 6, i).reduce((a, b) => a + b, 0) / 6;
    if (d[i] > 0.3 && d[i] > before * 3 + 0.15) {
      const t = (i + 1) / fps;
      if (!onsets.length || t - onsets[onsets.length - 1] > 0.2) onsets.push(t);
    }
  }
  const ts = cues.map((c) => c.t);
  const silent = onsets.filter((t) => !ts.some((c) => Math.abs(c - t) <= win));
  const blind = ts.filter((c) => {
    const i0 = Math.max(0, Math.floor((c - 0.15) * fps)), i1 = Math.min(d.length, Math.ceil((c + 0.15) * fps));
    return Math.max(0, ...d.slice(i0, i1)) < 0.005;     // not a single pixel changed (a typed key still counts)
  });
  return { onsets: onsets.length, silent: silent.map((t) => +t.toFixed(2)), blind: blind.map((t) => +t.toFixed(2)) };
}

export function audit(file, { maxHold = 1, endHold = 2.5, loop = false, outDir = 'out/check', quiet = 0.08, popMin = 6, cues = null } = {}) {
  mkdirSync(outDir, { recursive: true });
  const { fps, dur } = probe(file);
  const tmp = join(outDir, '.diff.txt');
  // d = percent of pixels that visibly changed since the previous frame; the threshold keeps
  // H.264 noise on static frames (a few levels everywhere) from reading as motion or a pop
  ff(['-i', file, '-vf', `scale=240:-2,format=gray,tblend=all_mode=difference,lut=y=if(gt(val\\,10)\\,255\\,0),signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=${tmp}`, '-f', 'null', '-']);
  const d = [...readFileSync(tmp, 'utf8').matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]) / 2.55);
  rmSync(tmp, { force: true });

  const holds = [];
  let start = -1;
  for (let i = 0; i <= d.length; i++) {
    const still = i < d.length && d[i] < quiet;
    if (still && start < 0) start = i;
    if (!still && start >= 0) {
      const t0 = (start + 1) / fps, t1 = (i + 1) / fps, len = t1 - t0;
      const atEnd = i === d.length;
      if (len > (atEnd ? endHold : maxHold)) holds.push({ from: +t0.toFixed(2), to: +t1.toFixed(2), len: +len.toFixed(2), end: atEnd });
      start = -1;
    }
  }
  const pops = [];
  for (let i = 1; i < d.length - 1; i++)
    if (d[i] > popMin && d[i] > 3 * Math.max(d[i - 1], d[i + 1], 0.5)) pops.push({ t: +((i + 1) / fps).toFixed(3), diff: +d[i].toFixed(1) });

  const secs = Math.ceil(dur);
  const energy = Array.from({ length: secs }, (_, s) => {
    const seg = d.slice(Math.floor(s * fps), Math.floor((s + 1) * fps));
    return seg.length ? seg.reduce((a, b) => a + b, 0) / seg.length : 0;
  });
  const peak = Math.max(...energy, 0.001), bars = '▁▂▃▄▅▆▇█';
  const bar = energy.map((e) => bars[Math.min(7, Math.floor((e / peak) * 7.99))]).join('');
  const dead = energy.map((e, s) => [s, e]).filter(([, e]) => e < quiet).map(([s]) => s);

  let seam = null;
  if (loop) {
    const a = join(outDir, '.first.png'), b = join(outDir, '.last.png'), m = join(outDir, '.seam.txt');
    ff(['-i', file, '-frames:v', '1', a]);
    ff(['-sseof', '-0.1', '-i', file, '-update', '1', b]);
    ff(['-i', a, '-i', b, '-filter_complex', `[0][1]blend=all_mode=difference,scale=240:-2,format=gray,lut=y=if(gt(val\\,10)\\,255\\,0),signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=${m}`, '-f', 'null', '-']);
    seam = Number(readFileSync(m, 'utf8').match(/YAVG=([\d.]+)/)?.[1] ?? NaN) / 2.55;
    for (const f of [a, b, m]) rmSync(f, { force: true });
  }

  const sync = cues ? soundSync(d, fps, cues) : null;
  const report = { file, fps, dur: +dur.toFixed(2), holds, pops, deadSeconds: dead, energy: energy.map((e) => +e.toFixed(2)), seam, sync };
  const lines = [
    `motion audit: ${file} (${dur.toFixed(1)} s, ${Math.round(fps)} fps)`,
    `motion per second: ${bar}`,
    holds.length ? `HOLDS (> ${maxHold}s still${holds.some((h) => h.end) ? `, end card > ${endHold}s` : ''}):` : `holds: none over ${maxHold}s`,
    ...holds.map((h) => `  ${h.from}s → ${h.to}s  (${h.len}s${h.end ? ', end card' : ''})`),
    pops.length ? `POPS / hard cuts (single-frame jumps): ${pops.length}` : 'pops: none',
    ...pops.slice(0, 20).map((p) => `  ${p.t}s  ${p.diff}% of pixels jump in one frame`),
    dead.length ? `dead seconds (almost no motion): ${dead.join(', ')}` : 'dead seconds: none',
    ...(seam === null ? [] : [`loop seam: ${seam.toFixed(2)}% of pixels differ ${seam < 1 ? '(seamless)' : '(VISIBLE JUMP: make the last frame equal the first)'}`]),
    ...(sync === null ? [] : [
      `sound sync: ${sync.onsets} visible events, ${cues.length} cues`,
      sync.silent.length ? `  events with no sound within 0.12 s: ${sync.silent.slice(0, 20).join(', ')}` : '  every visible event has a sound',
      sync.blind.length ? `  sounds with nothing moving: ${sync.blind.slice(0, 20).join(', ')}` : '  every sound has something moving',
    ]),
  ];
  writeFileSync(join(outDir, 'motion.txt'), lines.join('\n') + '\n');
  writeFileSync(join(outDir, 'motion.json'), JSON.stringify(report, null, 1));
  return { report, text: lines.join('\n') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const a = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
  const file = process.argv[2];
  if (!file || file.startsWith('--')) { console.log('usage: node motion-audit.mjs <video.mp4> [--max-hold 1] [--end-hold 2.5] [--loop] [--cues sfx_cues.json] [--out dir]'); process.exit(1); }
  const cues = a('cues') ? JSON.parse(readFileSync(a('cues'), 'utf8')) : null;
  const { report, text } = audit(file, { maxHold: Number(a('max-hold', 1)), endHold: Number(a('end-hold', 2.5)),
    loop: process.argv.includes('--loop'), outDir: a('out', 'out/check'), cues });
  console.log(text);
  process.exitCode = report.holds.length || (report.seam !== null && report.seam >= 1) ? 3 : 0;
}
