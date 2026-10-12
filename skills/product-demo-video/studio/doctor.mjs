// node doctor.mjs [--json]
// Checks the toolchain and which voice providers are ready. Prints key NAMES only, never values.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { loadEnv, flag } from './lib/env.mjs';
import { launch } from './lib/browser.mjs';

const env = loadEnv();
const run = (bin, args) => { try { return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n')[0].trim(); } catch { return null; } };
const has = (bin) => run('which', [bin]) !== null;

const checks = [];
const add = (name, ok, detail, fix, required = true) => checks.push({ name, ok: !!ok, detail, fix, required });

const nodeMajor = Number(process.versions.node.split('.')[0]);
add('node >= 18', nodeMajor >= 18, process.version, 'install Node 18+ (https://nodejs.org)');
add('ffmpeg', has('ffmpeg'), run('ffmpeg', ['-version']), 'brew install ffmpeg  |  apt install ffmpeg');
add('ffprobe', has('ffprobe'), run('ffprobe', ['-version']), 'ships with ffmpeg');
// Launched exactly as render.mjs and the capture scripts launch it (installed Chrome or Edge first).
let pw = false, pwDetail;
try { const b = await launch(); pwDetail = b.label; await b.close(); pw = true; }
catch (e) { pwDetail = e.message.split('\n')[0]; }
add('browser (Playwright driving Chrome)', pw, pwDetail, 'node workspace.mjs init <name> (installs the driver once for every video; downloads Chromium only if Chrome is missing)');
add('python librosa (only for a supplied music track)', run('python3', ['-c', 'import librosa; print(librosa.__version__)']), 'optional', 'pip install numpy librosa soundfile', false);
add('iOS Simulator (only for native iOS apps)', run('xcrun', ['simctl', 'help']) !== null, 'optional', 'install Xcode from the App Store', false);
add('adb (only for native Android apps)', has('adb'), 'optional', 'brew install android-platform-tools  |  apt install adb', false);

const voice = [
  ['elevenlabs', ['ELEVENLABS_API_KEY'], 'ElevenLabs (recommended)'],
  ['openai', ['OPENAI_API_KEY'], 'OpenAI TTS'],
  ['google', ['GOOGLE_TTS_API_KEY'], 'Google Cloud TTS'],
  ['azure', ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION'], 'Azure AI Speech'],
].map(([id, keys, label]) => ({ id, label, ready: keys.every((k) => env[k]), keys }));
voice.push({ id: 'local', label: 'Free local voice (drafts)', ready: has('say') || has('espeak-ng'), keys: [] });

if (flag('json')) {
  console.log(JSON.stringify({ checks, voice }, null, 1));
} else {
  for (const c of checks) console.log(`${c.ok ? '✓' : c.required ? '✗' : '–'} ${c.name.padEnd(48)} ${c.ok ? (c.detail || '') : `${c.detail && c.detail !== 'optional' ? c.detail + ' · ' : ''}fix: ${c.fix}`}`);
  console.log('\nVoiceover providers (in recommended order):');
  for (const v of voice) console.log(`${v.ready ? '✓' : '✗'} ${v.label.padEnd(28)} ${v.ready ? 'ready' : v.keys.length ? 'add ' + v.keys.join(' + ') + ' to ~/.config/product-demo-video/.env' : 'needs say or espeak-ng'}`);
}
writeFileSync('.doctor.json', JSON.stringify({ checks, voice }, null, 1));
process.exitCode = checks.some((c) => c.required && !c.ok) ? 1 : 0;
