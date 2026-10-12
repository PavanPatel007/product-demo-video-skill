// node prep-footage.mjs <screen-recording.mov|mp4> <name> [--fps 60] [--w 1600] [--from 0] [--to 8]
// Turns real footage into numbered JPEG frames + meta.json in assets/footage/<name>/, which the
// kit's footage() draws frame-exactly inside seek(t). A frame sequence instead of a <video>:
// headless Chromium can't decode H.264, and seeking a video element is not frame-exact.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';

const [src, name] = process.argv.slice(2);
if (!src || !name || name.startsWith('--')) {
  console.log('usage: node prep-footage.mjs <in.mov> <name> [--fps 60] [--w 1600] [--from s] [--to s]');
  process.exit(1);
}
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const fps = Number(arg('fps', 60)), w = Number(arg('w', 1600));
const dir = `assets/footage/${name}`;
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const trim = [...(arg('from') ? ['-ss', arg('from')] : []), ...(arg('to') ? ['-to', arg('to')] : [])];
execFileSync('ffmpeg', ['-v', 'error', '-y', ...trim, '-i', src, '-vf', `fps=${fps},scale=${w}:-2:flags=lanczos`,
  '-q:v', '2', `${dir}/%05d.jpg`], { stdio: 'inherit' });

const frames = readdirSync(dir).filter((f) => f.endsWith('.jpg')).length;
const [fw, fh] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height',
  '-of', 'csv=p=0', `${dir}/00001.jpg`], { encoding: 'utf8' }).trim().split(',').map(Number);
writeFileSync(`${dir}/meta.json`, JSON.stringify({ fps, frames, w: fw, h: fh, dur: +(frames / fps).toFixed(3), src }, null, 1));
console.log(`wrote ${frames} frames (${(frames / fps).toFixed(2)} s, ${fw}x${fh}) to ${dir}/`);
