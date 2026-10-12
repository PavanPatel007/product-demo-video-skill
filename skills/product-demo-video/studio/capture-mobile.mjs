// node capture-mobile.mjs devices                          booted iOS Simulators and Android devices
// node capture-mobile.mjs shot <name> [--ios|--android]    -> assets/mobile/<name>.png (+ <name>.json on Android)
// node capture-mobile.mjs record <name> --seconds 8         -> assets/mobile/<name>.mp4 (then prep-footage.mjs)
// node capture-mobile.mjs open <deep-link-url>              jump the app to a screen
// Native apps, which a browser can't capture. Read-only: never taps or types; the user (or a deep
// link) navigates. iOS shots and recordings get a clean status bar (9:41, full battery, full
// signal), cleared afterwards; on Android add --clean-status (demo mode, switched off afterwards).
// Android also saves the UI tree (text and bounds of every element) for cursor and ring targets.
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { arg, flag, positional } from './lib/env.mjs';

const [cmd, what] = positional(['ios', 'android', 'clean-status']);
const run = (bin, args, opts = {}) => execFileSync(bin, args, { encoding: opts.buffer ? undefined : 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28, ...opts });
const tryRun = (bin, args, opts) => { try { return run(bin, args, opts); } catch { return null; } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const iosDevices = () => {
  const out = tryRun('xcrun', ['simctl', 'list', 'devices', 'booted', '-j']);
  if (!out) return [];
  return Object.entries(JSON.parse(out).devices).flatMap(([rt, list]) => list.filter((d) => d.state === 'Booted')
    .map((d) => ({ udid: d.udid, name: `${d.name} (${rt.split('.').pop().replace(/-/g, ' ')})` })));
};
const androidDevices = () => (tryRun('adb', ['devices', '-l']) || '').split('\n').slice(1)
  .map((l) => l.match(/^(\S+)\s+device\b(.*)$/)).filter(Boolean)
  .map((m) => ({ serial: m[1], name: (m[2].match(/model:(\S+)/) || [, m[1]])[1] }));

if (cmd === 'devices' || !cmd) {
  const ios = iosDevices(), and = androidDevices();
  for (const d of ios) console.log(`ios      ${d.name}  ${d.udid}`);
  for (const d of and) console.log(`android  ${d.name}  ${d.serial}`);
  if (!ios.length && !and.length) {
    console.log('no booted iOS Simulator or Android device found.');
    console.log('  iOS: open -a Simulator (Xcode), then run the app there');
    console.log('  Android: start an emulator or plug in a phone with USB debugging on (adb devices)');
  }
  process.exit(cmd ? 0 : 1);
}

const ios = iosDevices(), and = androidDevices();
const platform = flag('android') ? 'android' : flag('ios') ? 'ios' : ios.length ? 'ios' : and.length ? 'android' : null;
if (!platform || (platform === 'ios' && !ios.length) || (platform === 'android' && !and.length)) {
  console.error(`no booted ${platform === 'android' ? 'Android device' : platform === 'ios' ? 'iOS Simulator' : 'iOS Simulator or Android device'}: run node capture-mobile.mjs devices`);
  process.exit(1);
}
const sim = ios[0]?.udid, adb = (args, opts) => run('adb', ['-s', and[0]?.serial, ...args], opts);
mkdirSync('assets/mobile', { recursive: true });
const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Clean status bar around a capture, always restored.
async function cleanStatus(fn) {
  if (platform === 'ios') {
    tryRun('xcrun', ['simctl', 'status_bar', sim, 'override', '--time', '9:41', '--dataNetwork', 'wifi', '--wifiMode', 'active', '--wifiBars', '3',
      '--cellularMode', 'active', '--cellularBars', '4', '--batteryState', 'charged', '--batteryLevel', '100']);
    await sleep(600);
    try { return await fn(); } finally { tryRun('xcrun', ['simctl', 'status_bar', sim, 'clear']); }
  }
  if (!flag('clean-status')) return fn();
  const allowed = tryRun('adb', ['-s', and[0].serial, 'shell', 'settings', 'get', 'global', 'sysui_demo_allowed'])?.trim();
  const demo = (...e) => adb(['shell', 'am', 'broadcast', '-a', 'com.android.systemui.demo', ...e]);
  adb(['shell', 'settings', 'put', 'global', 'sysui_demo_allowed', '1']);
  demo('-e', 'command', 'enter');
  demo('-e', 'command', 'clock', '-e', 'hhmm', '0941');
  demo('-e', 'command', 'battery', '-e', 'level', '100', '-e', 'plugged', 'false');
  demo('-e', 'command', 'network', '-e', 'wifi', 'show', '-e', 'level', '4', '-e', 'mobile', 'show', '-e', 'level', '4');
  demo('-e', 'command', 'notifications', '-e', 'visible', 'false');
  await sleep(600);
  try { return await fn(); } finally {
    demo('-e', 'command', 'exit');
    adb(['shell', 'settings', 'put', 'global', 'sysui_demo_allowed', allowed && allowed !== 'null' ? allowed : '0']);
  }
}

const size = (png) => { const b = readFileSync(png); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };

if (cmd === 'shot') {
  const name = slug(what);
  if (!name) { console.error('usage: node capture-mobile.mjs shot <name>'); process.exit(1); }
  const file = `assets/mobile/${name}.png`;
  await cleanStatus(async () => {
    if (platform === 'ios') run('xcrun', ['simctl', 'io', sim, 'screenshot', '--type=png', file]);
    else writeFileSync(file, adb(['exec-out', 'screencap', '-p'], { buffer: true }));
  });
  let tree = '';
  if (platform === 'android') {
    // uiautomator refuses busy (animating) screens; the shot still stands without the tree.
    const xml = tryRun('adb', ['-s', and[0].serial, 'exec-out', 'uiautomator', 'dump', '/dev/tty']);
    const nodes = [...(xml || '').matchAll(/<node\b([^>]*)>/g)].map(([, a]) => {
      const at = (k) => (a.match(new RegExp(`\\b${k}="([^"]*)"`)) || [])[1] || '';
      const [x1, y1, x2, y2] = (at('bounds').match(/\d+/g) || []).map(Number);
      return { text: at('text'), desc: at('content-desc'), id: at('resource-id'), cls: at('class').split('.').pop(), x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }).filter((n) => (n.text || n.desc) && n.w > 0);
    if (nodes.length) { writeFileSync(`assets/mobile/${name}.json`, JSON.stringify(nodes, null, 1)); tree = `, ${nodes.length} labelled elements -> assets/mobile/${name}.json`; }
  }
  const [w, h] = size(file);
  console.log(`${file} (${w}x${h}${tree}); in the film: phone(x, y, w, (sx, sy, sw, sh) => g.drawImage(IMG.${name.replace(/-/g, '_')}, sx, sy, sw, sh), { aspect: ${(h / w).toFixed(3)} })`);
} else if (cmd === 'record') {
  const name = slug(what), secs = Number(arg('seconds', 8));
  if (!name) { console.error('usage: node capture-mobile.mjs record <name> --seconds 8'); process.exit(1); }
  const file = `assets/mobile/${name}.mp4`, raw = `assets/mobile/${name}.raw.mp4`;
  console.log(`recording ${secs} s: use the app now`);
  await cleanStatus(async () => {
    if (platform === 'ios') {
      const p = spawn('xcrun', ['simctl', 'io', sim, 'recordVideo', '--codec=h264', '--force', raw], { stdio: 'ignore' });
      await sleep(secs * 1000);
      p.kill('SIGINT');
      await new Promise((r) => p.on('close', r));
    } else {
      adb(['shell', 'screenrecord', '--time-limit', String(secs), '/sdcard/pdv-capture.mp4']);
      adb(['pull', '/sdcard/pdv-capture.mp4', raw]);
      adb(['shell', 'rm', '/sdcard/pdv-capture.mp4']);
    }
  });
  // Both recorders only write a frame when the screen changes: make it 60 fps for the full length.
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', raw, '-vf', `fps=60,tpad=stop_mode=clone:stop_duration=${secs}`, '-t', String(secs),
    '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', '-an', file]);
  rmSync(raw, { force: true });
  console.log(`${file} (${secs} s, 60 fps); next: node prep-footage.mjs ${file} ${name}`);
} else if (cmd === 'open') {
  if (!what) { console.error('usage: node capture-mobile.mjs open <deep-link-url>'); process.exit(1); }
  if (platform === 'ios') run('xcrun', ['simctl', 'openurl', sim, what]);
  else adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', what]);
  console.log('opened', what);
} else {
  console.error(`unknown command ${cmd}: devices, shot, record or open`);
  process.exit(1);
}
