// Voiceover from a timed script, with any TTS provider whose key is in .env.
//
//   node voiceover.mjs providers                         which providers are ready (key names only)
//   node voiceover.mjs voices --provider elevenlabs      list voices (id + name)
//   node voiceover.mjs say --provider elevenlabs --voice <id> [--script vo_script.json] [--dur 56]
//        [--stability 0.5] [--style 0.2] [--speed 1]   ElevenLabs delivery; each line is sent with its
//                                                        neighbours as context so the read flows as one take
//
// vo_script.json: [{ "t": 0.3, "text": "AI can build your website." }, ...]  (t = start, seconds)
// Writes audio/voice.wav (all lines placed at their start times), audio/vo/NN.wav,
// audio/vo_timing.json (start/end per line + overrun warnings) and audio/vo_usage.json (characters billed).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { loadEnv, arg } from './lib/env.mjs';

const env = loadEnv();
const SR = 48000;

const has = (bin) => { try { execFileSync('which', [bin], { stdio: 'ignore' }); return true; } catch { return false; } };
const need = (k) => { if (!env[k]) throw new Error(`${k} is not set. Add it to .env (never paste keys in chat).`); return env[k]; };
async function http(url, opts, what) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${what} failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res;
}
const xml = (s) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

// Order = recommendation order shown to the user.
const PROVIDERS = {
  elevenlabs: {
    label: 'ElevenLabs (recommended: most natural voices, 29+ languages)',
    keys: ['ELEVENLABS_API_KEY'],
    async voices() {
      const r = await http('https://api.elevenlabs.io/v1/voices', { headers: { 'xi-api-key': need('ELEVENLABS_API_KEY') } }, 'ElevenLabs voices');
      return (await r.json()).voices.map((v) => ({ id: v.voice_id, name: v.name, info: [v.category, ...Object.values(v.labels || {})].filter(Boolean).join(', ') }));
    },
    async synth(text, voice, file, ctx = {}) {
      const model = env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';
      const voice_settings = { stability: Number(arg('stability', 0.5)), similarity_boost: 0.75, style: Number(arg('style', 0.2)),
        speed: Number(arg('speed', 1)), use_speaker_boost: true };
      const r = await http(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': need('ELEVENLABS_API_KEY'), 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: model, voice_settings, previous_text: ctx.previous, next_text: ctx.next }),
      }, 'ElevenLabs TTS');
      return { bytes: Buffer.from(await r.arrayBuffer()), ext: 'mp3' };
    },
  },
  openai: {
    label: 'OpenAI TTS (gpt-4o-mini-tts, steerable tone)',
    keys: ['OPENAI_API_KEY'],
    async voices() {
      return ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer', 'verse'].map((v) => ({ id: v, name: v, info: 'built-in' }));
    },
    async synth(text, voice) {
      const r = await http('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${need('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice, input: text, response_format: 'wav',
          instructions: env.OPENAI_TTS_INSTRUCTIONS || 'Confident, warm product-launch narrator. Natural pace.' }),
      }, 'OpenAI TTS');
      return { bytes: Buffer.from(await r.arrayBuffer()), ext: 'wav' };
    },
  },
  google: {
    label: 'Google Cloud Text-to-Speech',
    keys: ['GOOGLE_TTS_API_KEY'],
    async voices() {
      const lang = arg('lang', 'en-US');
      const r = await http(`https://texttospeech.googleapis.com/v1/voices?languageCode=${lang}&key=${need('GOOGLE_TTS_API_KEY')}`, {}, 'Google voices');
      return (await r.json()).voices.map((v) => ({ id: v.name, name: v.name, info: `${v.ssmlGender}, ${v.languageCodes.join('/')}` }));
    },
    async synth(text, voice) {
      const r = await http(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${need('GOOGLE_TTS_API_KEY')}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: { text }, voice: { languageCode: voice.split('-').slice(0, 2).join('-'), name: voice },
          audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: SR } }),
      }, 'Google TTS');
      return { bytes: Buffer.from((await r.json()).audioContent, 'base64'), ext: 'wav' };
    },
  },
  azure: {
    label: 'Azure AI Speech',
    keys: ['AZURE_SPEECH_KEY', 'AZURE_SPEECH_REGION'],
    async voices() {
      const r = await http(`https://${need('AZURE_SPEECH_REGION')}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
        { headers: { 'Ocp-Apim-Subscription-Key': need('AZURE_SPEECH_KEY') } }, 'Azure voices');
      return (await r.json()).filter((v) => v.Locale.startsWith(arg('lang', 'en-US'))).map((v) => ({ id: v.ShortName, name: v.DisplayName, info: `${v.Gender}, ${v.Locale}` }));
    },
    async synth(text, voice) {
      const lang = voice.split('-').slice(0, 2).join('-');
      const r = await http(`https://${need('AZURE_SPEECH_REGION')}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': need('AZURE_SPEECH_KEY'), 'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'riff-48khz-16bit-mono-pcm', 'User-Agent': 'product-demo-video' },
        body: `<speak version="1.0" xml:lang="${lang}"><voice name="${xml(voice)}">${xml(text)}</voice></speak>`,
      }, 'Azure TTS');
      return { bytes: Buffer.from(await r.arrayBuffer()), ext: 'wav' };
    },
  },
  local: {
    label: 'Free local voice (macOS say / espeak-ng): drafts and timing only',
    keys: [],
    ready: () => has('say') || has('espeak-ng'),
    async voices() {
      if (has('say')) return execFileSync('say', ['-v', '?'], { encoding: 'utf8' }).split('\n').filter(Boolean)
        .map((l) => { const m = l.match(/^(.+?)\s{2,}(\S+)\s+#/); return m && { id: m[1].trim(), name: m[1].trim(), info: m[2] }; }).filter(Boolean);
      return [{ id: 'en-us', name: 'espeak-ng en-us', info: 'espeak-ng' }];
    },
    async synth(text, voice, file) {
      if (has('say')) { execFileSync('say', [...(voice ? ['-v', voice] : []), '-o', file + '.aiff', text]); return { path: file + '.aiff' }; }
      execFileSync('espeak-ng', ['-v', voice || 'en-us', '-w', file + '.wav', text]); return { path: file + '.wav' };
    },
  },
};

const ready = (p) => (p.ready ? p.ready() : p.keys.every((k) => env[k]));

function toPcm(input) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', input, '-ac', '1', '-ar', String(SR), '-f', 's16le', '-'], { maxBuffer: 1 << 30 });
  const pcm = new Float32Array(raw.length / 2);
  for (let i = 0; i < pcm.length; i++) pcm[i] = raw.readInt16LE(i * 2) / 32768;
  return pcm;
}

function writeWav(file, buf) {
  const n = buf.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2);
  writeFileSync(file, b);
}

const cmd = process.argv[2];
const pid = arg('provider', 'elevenlabs');

if (cmd === 'providers') {
  const list = Object.entries(PROVIDERS).map(([id, p], i) => ({ id, rank: i + 1, label: p.label, ready: ready(p), needs: p.keys }));
  for (const p of list) console.log(`${p.ready ? '✓' : '✗'} ${p.id.padEnd(11)} ${p.label}${p.ready ? '' : `  (needs ${p.needs.join(' + ') || 'say or espeak-ng'})`}`);
} else if (cmd === 'voices') {
  const p = PROVIDERS[pid]; if (!p) throw new Error('unknown provider ' + pid);
  const voices = await p.voices();
  for (const v of voices.slice(0, Number(arg('limit', 40)))) console.log(`${v.id}\t${v.name}\t${v.info}`);
} else if (cmd === 'say') {
  const p = PROVIDERS[pid]; if (!p) throw new Error('unknown provider ' + pid);
  if (!ready(p)) throw new Error(`${pid} is not ready: needs ${p.keys.join(' + ') || 'say or espeak-ng'} in .env`);
  const voice = arg('voice', '');
  if (!voice && pid !== 'local') throw new Error('pass --voice <id> (list them with: node voiceover.mjs voices --provider ' + pid + ')');
  const lines = JSON.parse(readFileSync(arg('script', 'vo_script.json'), 'utf8')).sort((a, b) => a.t - b.t);
  rmSync('audio/vo', { recursive: true, force: true }); mkdirSync('audio/vo', { recursive: true });
  const clips = [];
  for (const [i, line] of lines.entries()) {
    const base = `audio/vo/${String(i).padStart(2, '0')}`;
    const out = await p.synth(line.text, voice, base, { previous: lines[i - 1]?.text, next: lines[i + 1]?.text });
    let src = out.path;
    if (!src) { src = `${base}.${out.ext}`; writeFileSync(src, out.bytes); }
    const pcm = toPcm(src);
    writeWav(`${base}.wav`, pcm);
    if (src !== `${base}.wav`) rmSync(src, { force: true });
    clips.push({ ...line, pcm, dur: pcm.length / SR });
    console.log(`line ${i}: ${(pcm.length / SR).toFixed(2)}s  "${line.text.slice(0, 60)}"`);
  }
  const end = Math.max(...clips.map((c) => c.t + c.dur));
  const total = Math.max(Number(arg('dur', 0)), end + 0.5);
  const mix = new Float32Array(Math.ceil(total * SR));
  for (const c of clips) { const s = Math.floor(c.t * SR); for (let i = 0; i < c.pcm.length && s + i < mix.length; i++) mix[s + i] += c.pcm[i]; }
  writeWav('audio/voice.wav', mix);
  const timing = clips.map((c, i) => {
    const next = clips[i + 1]?.t ?? Number(arg('dur', Infinity));
    const gap = next - (c.t + c.dur);
    return { i, t: c.t, end: +(c.t + c.dur).toFixed(2), dur: +c.dur.toFixed(2), text: c.text, overrun: gap < 0.15 ? +(-gap + 0.15).toFixed(2) : 0 };
  });
  writeFileSync('audio/vo_timing.json', JSON.stringify(timing, null, 1));
  const chars = lines.reduce((a, l) => a + l.text.length, 0);
  writeFileSync('audio/vo_usage.json', JSON.stringify({ provider: pid, voice, characters: chars, lines: lines.length,
    settings: pid === 'elevenlabs' ? { stability: Number(arg('stability', 0.5)), style: Number(arg('style', 0.2)), speed: Number(arg('speed', 1)) } : undefined }, null, 1));
  const bad = timing.filter((x) => x.overrun);
  console.log(`wrote audio/voice.wav (${total.toFixed(1)}s, ${lines.length} lines, ${chars} chars via ${pid})`);
  if (bad.length) {
    console.log('OVERRUNS (shorten the line or move the next shot later):');
    for (const b of bad) console.log(`  line ${b.i} at ${b.t}s runs ${b.overrun}s into the next line: "${b.text}"`);
    process.exitCode = 2;
  }
} else {
  console.log('usage: node voiceover.mjs providers | voices --provider <id> | say --provider <id> --voice <id> [--script vo_script.json] [--dur N]');
  process.exitCode = 1;
}
