// node render.mjs --w 1080 --h 1920 --out out/silent_9x16.mp4      full render, 60 fps, adaptive motion blur
// node render.mjs --w 1080 --h 1920 --stills 0.5,2,4,6              -> out/stills/*.png + out/stills/contact.png
// node render.mjs --stills beats | downbeats | every:0.25
// node render.mjs --verify                                          determinism check (same frame in any order)
// node render.mjs --cues sfx_cues.json                              write window.CUES (sound on the picture's timeline)
// node render.mjs --from 12 --to 16 --out out/fix.mp4               re-render only the seconds you changed
// --query "theme=house" is appended to the page URL (variants from one timeline)
//
// Motion blur is blended inside the page. --sub auto (default) block-matches the two ends of the
// shutter and spaces enough samples that nothing moves more than 3 px between neighbours (up to
// --max-sub), so fast moves get no ghost copies
// and still frames stay sharp. --sub N uses exactly N samples. --shutter 0.5 is a film-like 180°
// shutter (1 = the whole frame interval). Samples never cross a time listed in window.CUTS.
import { launch } from './lib/browser.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const raw = (k) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
const num = (k, d) => (raw(k) === undefined ? d : Number(raw(k)));
const W = num('w', 1080), H = num('h', 1920), FPS = num('fps', 60);
const SUB = raw('sub') ?? 'auto', MAX_SUB = num('max-sub', 32), SHUTTER = num('shutter', 0.5);
const STILLS = raw('stills');
const OUT = raw('out') ?? `out/silent_${W}x${H}.mp4`;
const QUERY = raw('query') ? '&' + raw('query') : '';

const run = (args) => new Promise((res, rej) => {
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  p.on('close', (code) => (code === 0 ? res() : rej(new Error('ffmpeg exited ' + code))));
  return p;
});

mkdirSync('out', { recursive: true });
// file access: WebGL planes and footage refuse file:// otherwise.
// software 2D canvas: Chrome moves a GPU canvas to the CPU after repeated getImageData, so pixels would depend on seek order.
const browser = await launch({ args: ['--allow-file-access-from-files', '--disable-accelerated-2d-canvas'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => { console.error('page error:', e.message); process.exit(1); });
await page.goto(`file://${process.cwd()}/index.html?w=${W}&h=${H}${QUERY}`);
await page.evaluate(() => window.ready);
const DUR = num('dur', await page.evaluate(() => window.DUR));
const canvas = page.locator('#c');

// In-page sampler. __t is the subframe being drawn, __ft the frame it belongs to (kit's frameLocal).
// Subdivision is driven by measured displacement: neighbouring samples are block-matched on a luma
// thumbnail (quarter resolution, so 1 thumb px is 4 output px) and split until nothing moves more
// than 0.75 thumb px (3 output px) between them; wider gaps step hard edges into visible stripes. Contrast alone can't do this: a beige card or thin text barely
// changes the pixels it leaves, yet ghosts badly.
await page.evaluate(() => {
  const c = document.getElementById('c'), ctx = c.getContext('2d');
  const k = 0.25, th = document.createElement('canvas');
  th.width = Math.max(1, Math.round(c.width * k)); th.height = Math.max(1, Math.round(c.height * k));
  const tg = th.getContext('2d', { willReadFrequently: true });
  // Area-averaged shrink in halving steps: a plain 8x bilinear shrink point-samples thin text, which
  // then flickers between subframes and reads as motion.
  const steps = [];
  for (let w = c.width, h = c.height; w / 2 > th.width; w = Math.ceil(w / 2), h = Math.ceil(h / 2)) {
    const s = document.createElement('canvas'); s.width = Math.ceil(w / 2); s.height = Math.ceil(h / 2);
    const sc = s.getContext('2d'); sc.imageSmoothingQuality = 'high'; steps.push(sc);
  }
  tg.imageSmoothingQuality = 'high';
  const thumb = () => {
    let src = c;
    for (const s of steps) { s.clearRect(0, 0, s.canvas.width, s.canvas.height); s.drawImage(src, 0, 0, s.canvas.width, s.canvas.height); src = s.canvas; }
    tg.clearRect(0, 0, th.width, th.height); tg.drawImage(src, 0, 0, th.width, th.height);
    const d = tg.getImageData(0, 0, th.width, th.height).data, y = new Float32Array(th.width * th.height);
    for (let i = 0, j = 0; j < y.length; i += 4, j++) y[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return y;
  };
  const changed = (a, b) => { for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > 2) return true; return false; };
  // Largest displacement (thumb px, sub-pixel) between two thumbnails: rank 16x16 tiles by change,
  // then search shifts up to +-12 on the 48 that changed most. Changes no shift explains (fades,
  // recolours) don't ghost and are ignored, unless big (a move past the range): then Infinity.
  // Below about 1 px the estimate is noise (zoom, antialiasing), so measure long spans, not short.
  const TS = 16, R = 12, TW = th.width, THh = th.height;
  const disp = (A, B) => {
    const tiles = [];
    for (let ty = 0; ty + TS <= THh; ty += TS) for (let tx = 0; tx + TS <= TW; tx += TS) {
      let s = 0;
      for (let y = ty; y < ty + TS; y++) for (let x = tx; x < tx + TS; x++) s += Math.abs(A[y * TW + x] - B[y * TW + x]);
      s /= TS * TS;
      if (s > 1) tiles.push([s, tx, ty]);
    }
    tiles.sort((p, q) => q[0] - p[0]);
    const N = 2 * R + 1, sc = new Float32Array(N * N), at2 = (dx, dy) => sc[(dy + R) * N + dx + R];
    // Sub-pixel offset of the minimum from three scores. Absolute differences make a V, not a parabola.
    const sub = (l, m, r) => {
      const h = Math.max(l, r) - m;
      return h > 0 && h < Infinity ? Math.max(-0.5, Math.min(0.5, (l - r) / (2 * h))) : 0;
    };
    let worst = 0;
    for (const [s0, tx, ty] of tiles.slice(0, 48)) {
      let best = s0, moved = Infinity;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        let s = 0, n = 0;
        for (let y = ty; y < ty + TS; y++) {
          const yy = y + dy; if (yy < 0 || yy >= THh) continue;
          for (let x = tx; x < tx + TS; x++) {
            const xx = x + dx; if (xx < 0 || xx >= TW) continue;
            s += Math.abs(A[y * TW + x] - B[yy * TW + xx]); n++;
          }
        }
        const v = n > TS * TS * 0.6 ? s / n : Infinity;
        sc[(dy + R) * N + dx + R] = v;
        if (v < best) best = v;
        if ((dx || dy) && v < moved) moved = v;
      }
      if (!(moved < s0 * 0.8)) { if (s0 > 40) return Infinity; continue; }
      // Smooth or striped tiles match many shifts almost equally: take the shortest of the near-best.
      let cx = 0, cy = 0, cm = Infinity;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        const m = Math.max(Math.abs(dx), Math.abs(dy));
        if (m < cm && at2(dx, dy) <= best * 1.15 + 0.5) { cm = m; cx = dx; cy = dy; }
      }
      const fx = cx + (Math.abs(cx) < R ? sub(at2(cx - 1, cy), at2(cx, cy), at2(cx + 1, cy)) : 0);
      const fy = cy + (Math.abs(cy) < R ? sub(at2(cx, cy - 1), at2(cx, cy), at2(cx, cy + 1)) : 0);
      worst = Math.max(worst, Math.abs(fx), Math.abs(fy));
    }
    return worst;
  };
  const grab = () => ctx.getImageData(0, 0, c.width, c.height).data;
  const at = async (t, ft) => { window.__t = t; window.__ft = ft; await window.seek(t); };
  const len = c.width * c.height * 4, E = new Float32Array(len), I = new Float32Array(len);
  const add = (acc, d) => { for (let i = 0; i < len; i++) acc[i] += d[i]; };

  window.__still = async (t) => { await at(t, t); };
  window.__hash = async (t) => {
    await at(t, t);
    const d = grab(); let h = 0x811c9dc5;
    for (let i = 0; i < d.length; i += 7) h = Math.imul(h ^ d[i], 16777619);
    return h >>> 0;
  };
  // Returns the number of samples blended into the canvas for the frame starting at t0.
  // Motion inside one shutter (8 ms) is close to linear, so the whole-span displacement sets an even
  // spacing of at most 0.75 thumb px (3 output px) between samples. A move past the search range is
  // measured on a shorter span and scaled up.
  window.__frame = async (t0, dt, { fixed, max, shutter, cuts }) => {
    const a = t0;
    let b = t0 + dt * shutter;
    for (const cut of cuts) if (cut > a + 1e-6 && cut < b) b = cut - 1e-4;
    if (fixed === 1 || b - a < 1e-5) { await at(a, t0); return 1; }
    E.fill(0); I.fill(0);
    await at(a, t0); const ta = thumb(); add(E, grab());
    let n = fixed - 1;
    if (!fixed) {
      await at(b, t0); const tb = thumb();
      if (!changed(ta, tb)) return 1;                        // still frame: stays sharp
      let d = disp(ta, tb);
      for (let span = 1; !(d < R - 1) && span > 1 / 16;) {
        span /= 2; await at(a + (b - a) * span, t0); d = disp(ta, thumb()) / span;
      }
      n = Math.min(max - 1, Math.max(1, Math.ceil(d / 0.75)));
    }
    for (let i = 1; i <= n; i++) { await at(a + ((b - a) * i) / n, t0); add(i === n ? E : I, grab()); }
    const out = ctx.createImageData(c.width, c.height), o = out.data;
    for (let i = 0; i < len; i++) o[i] = (E[i] * 0.5 + I[i]) / n;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.putImageData(out, 0, 0); ctx.restore();
    return n + 1;
  };
});

if (raw('cues')) {
  const cues = await page.evaluate(() => window.CUES);
  await browser.close();
  if (!Array.isArray(cues)) { console.error('index.html defines no window.CUES array'); process.exit(1); }
  cues.sort((x, y) => x.t - y.t);
  writeFileSync(raw('cues'), JSON.stringify(cues.map((c) => ({ ...c, t: +c.t.toFixed(4) })), null, 1));
  console.log(`wrote ${cues.length} cues to ${raw('cues')}`);
  process.exit(0);
}

if (process.argv.includes('--verify')) {
  // Same t, three orders (forward, backward, shuffled): any difference means state carried
  // between frames, Math.random, a timer, or an asset that wasn't loaded yet.
  let s = 7; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const times = Array.from({ length: 24 }, (_, i) => +((DUR * (i + rnd() * 0.9)) / 24).toFixed(3));
  const pass = async (order) => { const h = {}; for (const t of order) h[t] = await page.evaluate((t) => window.__hash(t), t); return h; };
  const fwd = await pass(times), back = await pass([...times].reverse()), mix = await pass([...times].sort(() => rnd() - 0.5));
  await browser.close();
  const bad = times.filter((t) => fwd[t] !== back[t] || fwd[t] !== mix[t]);
  console.log(bad.length ? `NOT DETERMINISTIC at ${bad.join(', ')} s (state carried between frames, Math.random or a timer)` : `deterministic: ${times.length} frames identical in 3 orders`);
  process.exit(bad.length ? 3 : 0);
}

if (STILLS) {
  rmSync('out/stills', { recursive: true, force: true });
  mkdirSync('out/stills', { recursive: true });
  let times;
  if (/^(beats|downbeats)$/.test(STILLS)) {
    const { bpm, off } = await page.evaluate(() => ({ bpm: window.BPM || 120, off: window.OFFSET || 0 }));
    const step = (60 / bpm) * (STILLS === 'downbeats' ? 4 : 1);
    times = [];
    for (let t = off + step * 0.45; t < DUR; t += step) times.push(+t.toFixed(3));   // mid-move, not on the hit
  } else if (STILLS.startsWith('every:')) {
    const step = Number(STILLS.slice(6));
    times = [];
    for (let t = step / 2; t < DUR; t += step) times.push(+t.toFixed(3));
  } else times = STILLS.split(',').map(Number);
  for (const [i, t] of times.entries()) {
    await page.evaluate((t) => window.__still(t), t);
    await canvas.screenshot({ path: `out/stills/${String(i).padStart(3, '0')}_t${t.toFixed(2)}.png` });
  }
  await browser.close();
  const cols = Math.min(times.length > 12 ? 8 : 6, times.length);
  await run(['-y', '-loglevel', 'error', '-framerate', '1', '-pattern_type', 'glob', '-i', 'out/stills/*_t*.png',
    '-vf', `scale=${W >= H ? 480 : 270}:-1,tile=${cols}x${Math.ceil(times.length / cols)}:padding=8:color=white`,
    '-frames:v', '1', 'out/stills/contact.png']);
  console.log(`wrote ${times.length} stills + out/stills/contact.png`);
  process.exit(0);
}

const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
  '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', OUT],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const cuts = await page.evaluate(() => (Array.isArray(window.CUTS) ? window.CUTS : []));
const opts = { fixed: SUB === 'auto' ? 0 : Math.max(1, Number(SUB)), max: MAX_SUB, shutter: SHUTTER, cuts };
const f0 = Math.round(num('from', 0) * FPS), f1 = Math.round(Math.min(DUR, num('to', DUR)) * FPS);
let samples = 0, heavy = 0;
const started = Date.now();
for (let f = f0; f < f1; f++) {
  const n = await page.evaluate(([t, dt, o]) => window.__frame(t, dt, o), [f / FPS, 1 / FPS, opts]);
  samples += n; if (n > 8) heavy++;
  const png = await canvas.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if ((f - f0) % FPS === 0) console.log(`rendered ${(f / FPS).toFixed(0)}s / ${(f1 / FPS).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
const frames = Math.max(1, f1 - f0);
console.log(`wrote ${OUT}: ${frames} frames, ${(samples / frames).toFixed(1)} samples/frame on average, ${heavy} fast frames got 9+, ${((Date.now() - started) / 1000).toFixed(0)} s`);
