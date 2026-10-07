// node ref.mjs <video.mp4 | X/Twitter post URL | direct .mp4 URL> [--name launch_ref]
// Turns a reference into things the agent can read: refs/<name>/sheet.png (2 frames per second),
// cuts, holds and motion rhythm, dominant palette, loudness, and (for X posts) the post text,
// which often contains the creator's prompt. Take the grammar, never the content.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { audit } from './motion-audit.mjs';
import { arg } from './lib/env.mjs';

const src = process.argv[2];
if (!src || src.startsWith('--')) { console.log('usage: node ref.mjs <video.mp4 | https://x.com/user/status/ID | https://.../clip.mp4> [--name ref]'); process.exit(1); }
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { maxBuffer: 1 << 28 });
const has = (bin) => { try { execFileSync('which', [bin], { stdio: 'ignore' }); return true; } catch { return false; } };

let file = src, postText = '', name = arg('name');
const x = src.match(/(?:x|twitter)\.com\/([^/]+)\/status\/(\d+)/);
if (x) {
  const r = await fetch(`https://api.fxtwitter.com/status/${x[2]}`);
  if (!r.ok) throw new Error(`could not read the post (HTTP ${r.status}); download the video and pass the file instead`);
  const tw = (await r.json()).tweet;
  const vids = [...(tw.media?.videos || []), ...(tw.quote?.media?.videos || [])];
  if (!vids.length) throw new Error('that post has no video; pass the post that contains it');
  name ||= `${tw.author.screen_name}_${x[2]}`.toLowerCase();
  postText = `@${tw.author.screen_name} · ${tw.likes ?? '?'} likes · ${tw.views ?? '?'} views\n\n${tw.text || ''}`;
  file = await download(vids[0].url, name);
} else if (/^https?:\/\//.test(src)) {
  name ||= basename(new URL(src).pathname, extname(new URL(src).pathname)) || 'ref';
  if (/\.(mp4|mov|webm)(\?|$)/i.test(src)) file = await download(src, name);
  else if (has('yt-dlp')) { mkdirSync('refs', { recursive: true }); file = `refs/${name}.mp4`; execFileSync('yt-dlp', ['-f', 'mp4', '-o', file, src], { stdio: 'inherit' }); }
  else throw new Error('not a direct video link. Install yt-dlp, or download the video and pass the file.');
}
name ||= basename(file, extname(file));

async function download(url, n) {
  mkdirSync('refs', { recursive: true });
  const out = `refs/${n}.mp4`;
  if (!existsSync(out)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`download failed: HTTP ${r.status}`);
    writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  }
  return out;
}

const dir = join('refs', name);
mkdirSync(dir, { recursive: true });
const info = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,r_frame_rate:format=duration', '-of', 'json', file], { encoding: 'utf8' }));
const vs = info.streams.find((s) => s.codec_type === 'video'), dur = Number(info.format.duration);
const hasAudio = info.streams.some((s) => s.codec_type === 'audio');
const [fa, fb] = vs.r_frame_rate.split('/').map(Number);
const aspect = vs.width / vs.height, fmt = aspect > 1.2 ? '16:9' : aspect < 0.85 ? '9:16' : '1:1';

const n = Math.ceil(dur * 2), cols = 8, rows = Math.ceil(n / cols);
ff(['-i', file, '-vf', `fps=2,scale=${fmt === '9:16' ? 160 : 300}:-1,tile=${cols}x${rows}:padding=4:color=white`, '-frames:v', '1', join(dir, 'sheet.png')]);

const stderr = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args], { encoding: 'utf8', maxBuffer: 1 << 26 }).stderr;
const cuts = [...stderr(['-i', file, '-vf', "select='gt(scene,0.3)',showinfo", '-f', 'null', '-']).matchAll(/pts_time:([\d.]+)/g)]
  .map((m) => +Number(m[1]).toFixed(2));

const pal = join(dir, '.pal.png');
ff(['-i', file, '-vf', 'fps=1,scale=160:-1,palettegen=max_colors=8:reserve_transparent=0:stats_mode=full', pal]);
const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', pal, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1 << 20 });
const colors = [];
for (let i = 0; i + 2 < raw.length && colors.length < 8; i += 3) {
  const hex = '#' + [raw[i], raw[i + 1], raw[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
  if (!colors.includes(hex)) colors.push(hex);
}

const lufs = hasAudio
  ? (stderr(['-i', file, '-af', 'ebur128', '-f', 'null', '-']).match(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/)?.[1] ?? '?') + ' LUFS'
  : 'no audio';

const { report, text } = audit(file, { outDir: dir, maxHold: 1, endHold: 3 });
const shotLens = [0, ...cuts, dur].map((v, i, a) => (i ? +(v - a[i - 1]).toFixed(2) : null)).filter((v) => v !== null);

const md = [
  `# Reference: ${name}`,
  '',
  `- File: \`${file}\` · ${dur.toFixed(1)} s · ${vs.width}x${vs.height} (${fmt}) · ${Math.round(fa / (fb || 1))} fps · loudness ${lufs}`,
  `- Hard cuts: ${cuts.length ? cuts.join(', ') + ' s' : 'none (continuous take: scenes transform into each other)'}`,
  `- Shot lengths: ${shotLens.join(' / ')} s`,
  `- Motion per second: ${text.split('\n')[1].replace('motion per second: ', '')}`,
  `- Holds over 1 s: ${report.holds.length ? report.holds.map((h) => `${h.from}-${h.to}s`).join(', ') : 'none'}`,
  `- Dominant colors: ${colors.join(' ')}`,
  '',
  postText ? `## Post text (may contain the creator's prompt)\n\n${postText}\n` : '',
  '## For the agent',
  '',
  `Open \`${join(dir, 'sheet.png')}\` (2 frames per second, read left to right) and write into`,
  '`docs/style_guide.md`: palette, type (family feel, weight, tracking, case), how text enters and',
  'leaves, transition types between scenes, camera moves, UI treatment (flat, 3D tilt, depth blur),',
  'pacing (beats per change, longest hold), sound feel. Take the grammar, never the content, logos or characters.',
].join('\n');
writeFileSync(join(dir, 'analysis.md'), md + '\n');
console.log(md);
