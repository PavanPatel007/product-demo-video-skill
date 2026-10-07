// node render.mjs --w 1080 --h 1920 --fps 60 --dur 10 --sub 4 --out out/silent_9x16.mp4
// node render.mjs --w 1080 --h 1920 --stills 0.5,2,4,6   -> out/stills/*.png + out/stills/contact.png
// --query "theme=house" is appended to the page URL (variants from one timeline)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';

const raw = (k) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : undefined; };
const num = (k, d) => (raw(k) === undefined ? d : Number(raw(k)));
const W = num('w', 1080), H = num('h', 1920), FPS = num('fps', 60), SUB = num('sub', 4);
const STILLS = raw('stills');
const OUT = raw('out') ?? `out/silent_${W}x${H}.mp4`;
const QUERY = raw('query') ? '&' + raw('query') : '';

const run = (args) => new Promise((res, rej) => {
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
  p.on('close', (code) => (code === 0 ? res() : rej(new Error('ffmpeg exited ' + code))));
  return p;
});

mkdirSync('out', { recursive: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });   // WebGL planes refuse file:// images otherwise
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => { console.error('page error:', e.message); process.exit(1); });
await page.goto(`file://${process.cwd()}/index.html?w=${W}&h=${H}${QUERY}`);
await page.evaluate(() => window.ready);
const DUR = num('dur', await page.evaluate(() => window.DUR));
const canvas = page.locator('#c');

if (STILLS) {
  rmSync('out/stills', { recursive: true, force: true });
  mkdirSync('out/stills', { recursive: true });
  // --stills 1,2.5,4 | beats (one per beat, mid-move) | downbeats | every:0.25
  let times;
  if (/^(beats|downbeats)$/.test(STILLS)) {
    const { bpm, off } = await page.evaluate(() => ({ bpm: window.BPM || 120, off: window.OFFSET || 0 }));
    const step = (60 / bpm) * (STILLS === 'downbeats' ? 4 : 1);
    times = [];
    for (let t = off + step * 0.45; t < DUR; t += step) times.push(+t.toFixed(3));
  } else if (STILLS.startsWith('every:')) {
    const step = Number(STILLS.slice(6));
    times = [];
    for (let t = step / 2; t < DUR; t += step) times.push(+t.toFixed(3));
  } else times = STILLS.split(',').map(Number);
  for (const [i, t] of times.entries()) {
    await page.evaluate((t) => window.seek(t), t);
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

// tmix averages SUB consecutive subframes (motion blur); select keeps one frame per group
const vf = `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/${FPS}/TB`;
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-i', '-',
  '-vf', vf, '-r', String(FPS), '-c:v', 'libx264', '-crf', '16', '-pix_fmt', 'yuv420p', OUT],
  { stdio: ['pipe', 'inherit', 'inherit'] });

const total = Math.round(DUR * FPS * SUB);
for (let i = 0; i < total; i++) {
  await page.evaluate((t) => window.seek(t), i / (FPS * SUB));
  const png = await canvas.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if (i % (FPS * SUB) === 0) console.log(`rendered ${i / (FPS * SUB)}s / ${DUR}s`);
}
ff.stdin.end();
await new Promise((r) => ff.on('close', r));
await browser.close();
console.log('wrote ' + OUT);
