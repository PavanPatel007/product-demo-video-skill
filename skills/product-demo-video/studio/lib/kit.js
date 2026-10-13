// Motion kit: the techniques the most-watched Opus 5.5 videos share (see research.md).
// Classic script; functions read the page globals g, T, DW, DH, S, IMG at call time.
// Everything is a pure function of its arguments: no timers, no state between frames.

// ---------- opacity ----------
// Scene-level opacity: transitions multiply into every element, so nothing pops back.
let SA = 1;
const alpha = (a) => { g.globalAlpha = clamp(a) * SA; };
const withAlpha = (a, fn) => { const p = SA; SA *= clamp(a); g.globalAlpha = SA; fn(); SA = p; g.globalAlpha = SA; };

// ---------- type ----------
const fontD = (size, w = T.dw) => `${w} ${size}px ${T.display}`;
const fontU = (size, w = T.uw) => `${w} ${size}px ${T.ui}`;
const fontM = (size, w = T.mw) => `${w} ${size}px ${T.mono}`;
function rrect(x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2))); }
const expoOut = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(p)));

// Letters rise out of a mask line, staggered; with `out`, they leave upward through the same line.
// The keynote launch staple: no fades. Returns the drawn width.
function maskRise(text, x, y, t, { size = 96, weight, color = T.fg, align = 'left', stagger = 0.028, out, accentLast = false, font } = {}) {
  g.save();
  g.font = font || fontD(size, weight); g.letterSpacing = `${size * T.track}px`; g.textBaseline = 'alphabetic';
  const total = g.measureText(text).width;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  rrect(cx - size * 0.1, y - size * 1.02, total + size * 0.3, size * 1.3, 0); g.clip();
  const chars = [...text];
  chars.forEach((ch, i) => {
    const w = g.measureText(ch).width;
    const s = sp(t - i * stagger, 'heavy');
    const o = out === undefined ? 0 : sp(t - out - i * stagger * 0.6, 'snappy');
    alpha(1);
    g.fillStyle = accentLast && i === chars.length - 1 ? T.accent : color;
    g.fillText(ch, cx, y + (1 - s) * size * 1.3 - o * size * 1.45);
    cx += w;   // measureText already includes letterSpacing
  });
  g.restore();
  return total;
}

// Kinetic words: each word rises on its own spring. hi = word indices to highlight. Returns block height.
function words(text, x, y, t, { size = 80, color = T.fg, maxW = DW - 240, lh = 1.08, align = 'left', hi = [], stagger = 0.07, weight } = {}) {
  g.save();
  g.font = fontD(size, weight); g.letterSpacing = `${size * T.track}px`; g.textBaseline = 'alphabetic';
  const space = g.measureText(' ').width;
  const lines = [[]]; let lw = 0;
  for (const w of text.split(' ')) {
    const ww = g.measureText(w).width;
    if (lw + ww > maxW && lines[lines.length - 1].length) { lines.push([]); lw = 0; }
    lines[lines.length - 1].push(w); lw += ww + space;
  }
  let i = 0;
  lines.forEach((ln, li) => {
    const total = ln.reduce((a, w) => a + g.measureText(w).width, 0) + space * (ln.length - 1);
    let cx = align === 'center' ? x - total / 2 : x;
    const cy = y + li * size * lh;
    ln.forEach((w, j) => {
      const ww = g.measureText(w).width, s = sp(t - i * stagger, 'heavy');
      const isHi = hi.includes(i), joinNext = isHi && j < ln.length - 1 && hi.includes(i + 1);
      if (isHi && T.wordBand) {
        const b = sp(t - i * stagger - 0.25, 'snappy');
        alpha(1); g.fillStyle = T.band;
        g.fillRect(cx - size * 0.08, cy - size * 0.86, (ww + size * 0.16 + (joinNext ? space : 0)) * clamp(b), size * 1.08);
      }
      g.save(); g.beginPath(); g.rect(cx - size, cy - size * 1.05, ww + size * 2, size * 1.35); g.clip();
      alpha(1);
      g.fillStyle = isHi && !T.wordBand ? T.accent : color; g.textAlign = 'left';
      g.fillText(w, cx, cy + (1 - s) * size * 1.1);
      g.restore();
      cx += ww + space; i++;
    });
  });
  g.restore();
  return lines.length * size * lh;
}

// Glyphs scramble, then settle left to right (decode effect). With `out`, they scramble again and
// vanish right to left. Seeded, and read at frame time so glyphs don't smear in the motion blur.
function scramble(text, x, y, t, opts = {}) { return _scramble(text, x, y, frameLocal(t), opts); }
function _scramble(text, x, y, t, { size = 28, dur = 0.6, color = T.fg, font, seed = 3, align = 'left', out, set = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*' } = {}) {
  if (t <= 0) return 0;
  if (out !== undefined && t > out) {
    const n = text.length, gone = Math.floor(((t - out) / (dur * 0.6)) * n);
    if (gone >= n) return 0;
    return _scramble(text.slice(0, n - gone), x, y, dur * 0.5, { size, dur, color, font, seed: seed + Math.floor((t - out) * 30), align, set });
  }
  g.save();
  g.font = font || fontM(size); g.letterSpacing = '0px'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const total = g.measureText(text).width;
  let cx = align === 'center' ? x - total / 2 : x;
  const frame = Math.floor(t * 30), chars = [...text];
  chars.forEach((ch, i) => {
    const settle = (i / Math.max(1, chars.length - 1)) * dur;
    const w = g.measureText(ch).width;
    let c = ch;
    if (t < settle && ch !== ' ') c = set[Math.floor(rng(seed * 7919 + i * 131 + frame)() * set.length)];
    alpha(t < settle ? 0.65 : 1);
    g.fillStyle = color; g.fillText(c, cx, y);
    cx += w;
  });
  g.restore();
  return total;
}

// Keystroke times (seconds from the start) with a human rhythm: seeded jitter, a beat after
// spaces, a longer one after punctuation. Use the same call for the "key" SFX cues.
function typeTimes(text, { cps = 22, seed = 11, rhythm = true } = {}) {
  const r = rng(seed), out = []; let at = 0;
  for (let i = 0; i < text.length; i++) {
    out.push(at);
    const ch = text[i];
    at += rhythm ? (0.55 + 0.9 * r()) / cps * (/[.,!?;:]/.test(ch) ? 2.6 : ch === ' ' ? 1.35 : 1) : 1 / cps;
  }
  return out;
}

// Typed text with a caret that blinks only when idle. Returns the visible width.
// Lines are fixed: pass one call per line so the camera never chases a wrapping caret.
function typeOn(text, x, y, t, { cps = 22, size = 32, color = T.fg, font, caret = true, seed = 11, rhythm = true } = {}) {
  t = frameLocal(t);
  if (t <= 0) return 0;
  g.save();
  g.font = font || fontU(size); g.letterSpacing = '0px'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const times = typeTimes(text, { cps, seed, rhythm });
  let n = 0; while (n < text.length && times[n] <= t) n++;
  const shown = text.slice(0, n), w = g.measureText(shown).width;
  alpha(1); g.fillStyle = color; g.fillText(shown, x, y);
  const typing = n < text.length;
  if (caret && (typing || Math.floor(t * 2) % 2 === 0)) g.fillRect(x + w + 3, y - size * 0.8, Math.max(2, size * 0.07), size * 0.95);
  g.restore();
  return w;
}

// Poster-scale word slam on a beat: expo-out scale with horizontal stretch and two echo frames.
function slam(word, cx, cy, t, { size = 220, color = T.fg, field, weight = 900 } = {}) {
  if (t < 0) return;
  if (field) { alpha(1); g.fillStyle = field; g.fillRect(-DW, -DH, DW * 3, DH * 3); }
  g.save();
  g.font = fontD(size, weight); g.letterSpacing = `${size * T.track}px`; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const [lag, a] of [[0.06, 0.18], [0.03, 0.35], [0, 1]]) {
    const p = expoOut((t - lag) / 0.35);
    if (t - lag < 0) continue;
    g.save(); g.translate(cx, cy); g.scale(lerp(1.6, 1, p), lerp(0.75, 1, p));
    alpha(a); g.fillStyle = color; g.fillText(word, 0, 0); g.restore();
  }
  g.restore();
}

// Number that counts up with an ease-out; mono face keeps digits from jittering. The value is read
// at frame time, so the digits stay crisp under motion blur.
function countUp(from, to, x, y, t, { dur = 1, size = 64, color = T.fg, decimals = 0, prefix = '', suffix = '', align = 'left', font } = {}) {
  const p = 1 - Math.pow(1 - clamp(frameLocal(t) / dur), 3);
  const v = lerp(from, to, p);
  g.save(); g.font = font || fontM(size, 600); g.letterSpacing = '0px'; g.textAlign = align; g.textBaseline = 'alphabetic';
  alpha(t > 0 ? 1 : 0); g.fillStyle = color;
  g.fillText(prefix + v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix, x, y);
  g.restore();
}

// A line that draws through a word (strike) or under it (underline).
function strike(x, y, w, t, { color = T.accent, lw = 8 } = {}) {
  const p = sp(t, 'snappy');
  if (p <= 0) return;
  g.save(); alpha(1); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + w * clamp(p, 0, 1), y); g.stroke(); g.restore();
}

// Small uppercase kicker / chapter label.
function label(text, x, y, t, { size = 20, color = T.faint, align = 'left' } = {}) {
  const s = sp(t, 'base');
  g.save(); alpha(s * 1.4);
  g.font = fontM(size); g.letterSpacing = `${size * T.mtrack}px`;
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
  g.fillText(text.toUpperCase(), x + (1 - s) * -20, y);
  g.restore();
}

// Wordmark whose letters rise through a mask, then an accent period pops in. Returns [width, dotX].
function wordmark(text, cx, cy, size, t, { color = T.fg, dot = true } = {}) {
  g.save(); g.font = fontD(size, 800); g.letterSpacing = `${size * T.track}px`;
  const w = g.measureText(text).width, dotR = size * 0.11;
  g.restore();
  const x = cx - (w + (dot ? dotR * 3 : 0)) / 2;
  maskRise(text, x, cy + size * 0.35, t, { size, weight: 800, color, stagger: 0.035 });
  if (dot) {
    const s = sp(t - 0.05 - text.length * 0.035, 'snappy');
    g.save(); alpha(1); g.fillStyle = T.accent; g.beginPath();
    g.arc(x + w + dotR * 1.6, cy + size * 0.35 - dotR, dotR * clamp(s, 0, 1.15), 0, Math.PI * 2); g.fill(); g.restore();
  }
  return [w, x + w + dotR * 1.6];
}

// Accordion: the wordmark squeezes into its own period. p 0 = full word, 1 = only the dot.
// Every letter moves toward the dot by the same factor and its drawn width follows, so the
// letters stay touching (zero's launch-film open; run p backwards for the loop's last beat).
// Returns the dot { x, y, r } so it can grow into the next shape (pill, iris, portal).
// at: 'center' centres the full lockup on (x, y); 'dot' pins the dot's centre to (x, y) for every p,
// so the first frame and the loop's last frame line up exactly.
function squeeze(text, x, y, size, p, { color = T.fg, weight = 800, dotColor = T.accent, at = 'center' } = {}) {
  g.save(); g.font = fontD(size, weight); g.letterSpacing = `${size * T.track}px`;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const chars = [...text], ws = chars.map((ch) => g.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0), r = size * 0.11, gap = size * 0.06;
  const k = 1 - clamp(p);
  const edge = at === 'dot' ? x - r - gap * k : x - (total + gap + r * 2) / 2 + total;
  const base = at === 'dot' ? y + r : y + size * 0.35;
  alpha(1); g.fillStyle = color;
  let before = 0;
  chars.forEach((ch, i) => {
    if (k > 0.002) {
      g.save(); g.translate(edge - (total - before) * k, base); g.scale(k, 1); g.fillText(ch, 0, 0); g.restore();
    }
    before += ws[i];
  });
  const dot = { x: edge + gap * k + r, y: base - r, r };
  g.fillStyle = dotColor; g.beginPath(); g.arc(dot.x, dot.y, r, 0, Math.PI * 2); g.fill();
  g.restore();
  return dot;
}

// ---------- UI primitives (rebuild real UI with the product's real copy and colors) ----------
// lift: elevation. The shadow grows with it (and should grow with the shape's height as it morphs),
// so a card that pops toward the camera reads as rising, not just scaling.
function card(x, y, w, h, { r = 20, fill = T.panel, shadow = true, stroke, lift = 1 } = {}) {
  g.save(); alpha(1);
  if (shadow) { g.shadowColor = T.shadow; g.shadowBlur = T.shadowBlur * lift * S; g.shadowOffsetY = T.shadowBlur * 0.3 * lift * S; }
  rrect(x, y, w, h, r); g.fillStyle = fill; g.fill();
  g.shadowColor = 'transparent';
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
  g.restore();
}

function pill(text, cx, cy, s, { fill = T.accent, color = T.onAccent, size = 30, padX = 40, h = 76 } = {}) {
  g.save(); g.font = fontU(size, 600); g.letterSpacing = '0px';
  const w = g.measureText(text).width + padX * 2, ww = Math.max(h * clamp(s, 0, 1.2), w * clamp(s, 0, 1.2));
  alpha(1); rrect(cx - ww / 2, cy - h / 2, ww, h, h / 2); g.fillStyle = fill; g.fill();
  rrect(cx - ww / 2, cy - h / 2, ww, h, h / 2); g.clip();
  g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, cx, cy + 1 + (1 - clamp((s - 0.55) * 2.2)) * h * 0.7);
  g.restore();
  return w;
}

function chip(text, x, y, { size = 22, fill = T.band, color = T.fg, h = 40 } = {}) {
  g.save(); g.font = fontU(size, 600); g.letterSpacing = '0px';
  const w = g.measureText(text).width + h * 0.8;
  alpha(1); rrect(x, y, w, h, h / 2); g.fillStyle = fill; g.fill();
  g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(text, x + h * 0.4, y + h / 2 + 1);
  g.restore();
  return w;
}

// on: 0..1 spring value. The knob leads, the fill follows (two springs feel physical).
function toggle(x, y, on, { w = 88, h = 50, onColor = T.accent, offColor = T.faint } = {}) {
  g.save(); alpha(1);
  rrect(x, y, w, h, h / 2); g.fillStyle = mixColor(offColor, onColor, clamp(on)); g.fill();
  const k = h - 8;
  rrect(x + 4 + (w - k - 8) * on, y + 4, k * (1 + 0.15 * Math.sin(Math.PI * clamp(on))), k, k / 2);
  g.fillStyle = '#FFFFFF'; g.fill();
  g.restore();
}

// Screenshot (or a sub-rect [sx, sy, sw, sh] of one) as a flat card.
function shot(img, x, y, w, { src, radius = 22, s = 1, shadow = true } = {}) {
  const [sx, sy, sw, sh] = src || [0, 0, img.width, img.height];
  const h = w * sh / sw;
  g.save(); alpha(1);
  g.translate(x + w / 2, y + h / 2); g.scale(s, s); g.translate(-w / 2, -h / 2);
  if (shadow) {
    g.shadowColor = T.shadow; g.shadowBlur = T.shadowBlur * S; g.shadowOffsetY = T.shadowBlur * 0.35 * S;
    rrect(0, 0, w, h, radius); g.fillStyle = T.panel; g.fill(); g.shadowColor = 'transparent';
  }
  rrect(0, 0, w, h, radius); g.clip();
  g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  g.restore();
  return h;
}

// Accent outline that settles onto a real UI element (boxes from assets/targets.json).
function ring(x, y, w, h, p, { r = 12, color = T.accent, lw = 4 } = {}) {
  if (p <= 0) return;
  const e = (1 - clamp(p)) * 16;
  g.save(); alpha(p * 2);
  rrect(x - e, y - e, w + e * 2, h + e * 2, r + e); g.strokeStyle = color; g.lineWidth = lw; g.stroke();
  g.restore();
}

// Cursor. Draw it inside camera() so it scales with the zoom, screen-studio style.
// hover 0-1 grows the arrow (x1.5 at 1) as it reaches a target, the way macOS-style demo cursors
// do; rot (radians) turns its tip toward where it is heading (cursorPath returns both).
function cursor(x, y, press = 0, a = 1, { hover = 0, rot = 0 } = {}) {
  g.save(); alpha(a);
  const k = 1.25 * (1 + 0.5 * clamp(hover)) * (1 - 0.15 * press);
  g.translate(x, y); g.rotate(rot); g.scale(k, k);
  g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = 8; g.shadowOffsetY = 3;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 30); g.lineTo(8, 23); g.lineTo(14, 36);
  g.lineTo(19, 34); g.lineTo(13, 21); g.lineTo(24, 21); g.closePath();
  g.fillStyle = T.cursor; g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = T.cursor === '#FFFFFF' ? '#0B0B0A' : '#FFFFFF'; g.lineWidth = 2; g.stroke();
  g.restore();
}
function ripple(x, y, t) {
  if (t <= 0 || t > 0.5) return;
  g.save(); g.beginPath(); g.arc(x, y, 46 * sp(t, 'snappy'), 0, Math.PI * 2);
  g.strokeStyle = T.accent; alpha(1 - t / 0.5); g.lineWidth = 4; g.stroke(); g.restore();
}

// Cursor path through [[t, x, y], ...] with a press at each `clicks` time.
// Returns { x, y, press, hover, rot }: hover rises over the 0.35 s before each click, rot leans the
// tip toward the direction of travel (up to about 35°, only while moving fast).
function cursorPath(t, keys, clicks = []) {
  const at = (u) => [track(u, keys.map(([k, kx]) => [k, kx]), 170, 26), track(u, keys.map(([k, , ky]) => [k, ky]), 170, 26)];
  const [x, y] = at(t), [x2, y2] = at(t + 1 / 120), vx = (x2 - x) * 120, vy = (y2 - y) * 120, v = Math.hypot(vx, vy);
  const press = Math.max(0, ...clicks.map((c) => clamp(1 - Math.abs(t - c) / 0.1)));
  const hover = Math.max(0, ...clicks.map((c) => (t < c ? clamp((t - c + 0.35) / 0.25) : clamp(1 - (t - c - 0.15) / 0.3))));
  let d = Math.atan2(vy, vx) + Math.PI * 0.75; d = Math.atan2(Math.sin(d), Math.cos(d));   // 0 = tip leads (arrow points up-left)
  const rot = clamp(d, -0.6, 0.6) * clamp((v - 150) / 900);
  return { x, y, press, hover, rot };
}

// ---------- camera and depth ----------
// Screen-studio camera: zoom z around focus point (fx, fy), placed at (sx, sy) on screen.
// Use inside g.save()/g.restore(); drive z/fx/fy with track() so moves chain without cuts.
function camera(z, fx, fy, sx = DW / 2, sy = DH / 2) { g.translate(sx, sy); g.scale(z, z); g.translate(-fx, -fy); }

// One camera for the whole film, keyed by [time, zoom, focusX, focusY]. Each key starts one eased
// move (glide by default); zoom is interpolated in log space so pushes feel even. Applies the
// transform and returns { z, fx, fy }. Rules from the top films: one move per scene, never zoom
// in and straight back out, never push into a tiny off-centre point (open it with portal/iris).
function camPath(t, keys, { dur = 0.8, ease = GLIDE, sx = DW / 2, sy = DH / 2 } = {}) {
  const z = Math.exp(keyed(t, keys.map((k) => [k[0], Math.log(k[1])]), { dur, ease }));
  const fx = keyed(t, keys.map((k) => [k[0], k[2]]), { dur, ease });
  const fy = keyed(t, keys.map((k) => [k[0], k[3]]), { dur, ease });
  camera(z, fx, fy, sx, sy);
  return { z, fx, fy };
}

// Depth of field: draw fn() blurred by px design units (background UI behind a sharp foreground).
function blurred(px, fn) {
  if (px <= 0.05) return fn();
  g.save(); g.filter = `blur(${(px * S).toFixed(2)}px)`; fn(); g.restore();
}

// True perspective for a screenshot or canvas: rx/ry/rz in degrees, persp in design units.
// Respects the current transform (camera), rounded corners and a soft shadow. WebGL, deterministic.
const _gl = { tex: new WeakMap() };
function _glInit() {
  if (_gl.ctx) return _gl;
  const cv = document.createElement('canvas'); cv.width = g.canvas.width; cv.height = g.canvas.height;
  let gl = cv.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true });
  _gl.v2 = !!gl;
  if (!gl) gl = cv.getContext('webgl', { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: true });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec4 p; attribute vec2 uv; varying vec2 v; void main(){ v = uv; gl_Position = p; }'));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `precision highp float; varying vec2 v; uniform sampler2D s; uniform vec2 sz; uniform float r;
    void main(){ vec2 q = abs(v * sz - sz * 0.5) - (sz * 0.5 - r); float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
      gl_FragColor = texture2D(s, v) * (1.0 - smoothstep(-1.5, 0.5, d)); }`));
  gl.linkProgram(prog); gl.useProgram(prog);
  _gl.pos = gl.createBuffer(); _gl.uv = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, _gl.uv); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  const uvLoc = gl.getAttribLocation(prog, 'uv'); gl.enableVertexAttribArray(uvLoc); gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
  _gl.pLoc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(_gl.pLoc);
  _gl.uSz = gl.getUniformLocation(prog, 'sz'); _gl.uR = gl.getUniformLocation(prog, 'r');
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  Object.assign(_gl, { ctx: gl, cv });
  return _gl;
}
function plane3d(img, cx, cy, w, { rx = 0, ry = 0, rz = 0, persp = 2200, radius = 18, shadow = true, blur = 0 } = {}) {
  const G = _glInit(), gl = G.ctx;
  const h = w * img.height / img.width, d2r = Math.PI / 180;
  const [a, b, c] = [rx * d2r, ry * d2r, rz * d2r];
  const m = g.getTransform();
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]].map(([x, y]) => {
    let X = x * Math.cos(c) - y * Math.sin(c), Y = x * Math.sin(c) + y * Math.cos(c), Z = 0;
    [Y, Z] = [Y * Math.cos(a) - Z * Math.sin(a), Y * Math.sin(a) + Z * Math.cos(a)];
    [X, Z] = [X * Math.cos(b) + Z * Math.sin(b), -X * Math.sin(b) + Z * Math.cos(b)];
    const k = persp / (persp + Z), lx = cx + X * k, ly = cy + Y * k;
    return { dx: m.a * lx + m.c * ly + m.e, dy: m.b * lx + m.d * ly + m.f, wq: 1 / k };
  });
  if (shadow) {
    const OFF = 1e5;   // draw the shape far off-canvas so only its shadow lands in frame
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = SA;
    g.shadowColor = T.shadow; g.shadowBlur = T.shadowBlur * S * 1.4; g.shadowOffsetX = -OFF; g.shadowOffsetY = T.shadowBlur * S * 0.5;
    g.beginPath(); [0, 1, 3, 2].forEach((i, j) => (j ? g.lineTo : g.moveTo).call(g, pts[i].dx + OFF, pts[i].dy)); g.closePath();
    g.fillStyle = '#000'; g.fill(); g.restore();
  }
  let tex = G.tex.get(img);
  if (!tex) {
    tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (G.v2) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    G.tex.set(img, tex);
  }
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.viewport(0, 0, G.cv.width, G.cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  const W2 = G.cv.width / 2, H2 = G.cv.height / 2;
  gl.bindBuffer(gl.ARRAY_BUFFER, G.pos);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts.flatMap((p) => [(p.dx / W2 - 1) * p.wq, (1 - p.dy / H2) * p.wq, 0, p.wq])), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(G.pLoc, 4, gl.FLOAT, false, 0, 0);
  gl.uniform2f(G.uSz, img.width, img.height); gl.uniform1f(G.uR, radius * img.width / w);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = SA;
  if (blur > 0) g.filter = `blur(${(blur * S).toFixed(2)}px)`;
  g.drawImage(G.cv, 0, 0); g.restore();
  return h;
}

// ---------- transitions (no crossfades: objects become the next scene) ----------
// Distance from (cx, cy) to the farthest frame corner, overscaled so a flood clears every corner.
const farR = (cx, cy) => Math.hypot(Math.max(cx, DW - cx), Math.max(cy, DH - cy)) * 1.06;

// Flood: a shape grows from (cx, cy) past every corner. Drive p 0->1 over about 0.3-0.35 s:
// faster reads as a flash, slower lets half the frame change in one beat. area: ease by area.
function flood(cx, cy, p, { color = T.fg, area = false } = {}) {
  if (p <= 0) return;
  const R = farR(cx, cy) * (area ? byArea(p) : clamp(p, 0, 1.2));
  g.save(); alpha(1); g.fillStyle = color; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill(); g.restore();
}
// Contract: the flood colour covers everything except a growing hole at (cx, cy). p 0 -> 1 opens it.
function contract(cx, cy, p, { color = T.fg, area = false } = {}) {
  if (p >= 1) return;
  const R = farR(cx, cy) * (area ? byArea(p) : Math.max(0, p));
  g.save(); alpha(1); g.fillStyle = color; g.beginPath(); g.rect(-DW, -DH, DW * 3, DH * 3);
  g.arc(cx, cy, Math.max(0, R), 0, Math.PI * 2, true); g.fill('evenodd'); g.restore();
}

// Iris: real camera blades around a hexagonal aperture, opening onto drawInside(). p 0 = shut,
// 1 = open. Each blade is two aperture vertices, both edge extensions out to the housing and the
// SHORT arc between them, so the six blades tile the ring exactly. Eased by area (a closing iris
// eased by radius jumps in its first frames). color: null skips the blades (a plain aperture).
function iris(cx, cy, p, drawInside, { blades = 6, maxR, color = T.fg, twist = 0.9, seam } = {}) {
  const R = maxR ?? farR(cx, cy);
  const a = R * 1.16 * byArea(p);                          // aperture circumradius (hexagon corners)
  const rot = -Math.PI / 2 + twist * (1 - clamp(p));
  const V = Array.from({ length: blades }, (_, i) => {
    const an = rot + (i / blades) * Math.PI * 2;
    return [cx + Math.cos(an) * a, cy + Math.sin(an) * a];
  });
  if (a > 0.5) {
    g.save(); g.beginPath(); V.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.clip(); drawInside(); g.restore();
  }
  if (!color || a >= R * 1.15) return;
  const Rh = Math.max(R, a * 1.02);                        // housing; past R it is off-frame anyway
  // P[j]: edge (j-1 -> j) extended past vertex j until it meets the housing circle
  const P = V.map((v, j) => {
    const u = V[(j - 1 + blades) % blades], dx = v[0] - u[0], dy = v[1] - u[1], L = Math.hypot(dx, dy) || 1;
    const d = [dx / L, dy / L], w = [v[0] - cx, v[1] - cy];
    const b = w[0] * d[0] + w[1] * d[1], s = -b + Math.sqrt(Math.max(0, b * b - (w[0] ** 2 + w[1] ** 2 - Rh * Rh)));
    return [v[0] + d[0] * s, v[1] + d[1] * s];
  });
  const line = seam ?? mixColor(color, T.bg, 0.18);
  g.save(); alpha(1);
  for (let i = 0; i < blades; i++) {
    const j = (i + 1) % blades, [p0, p1] = [P[j], P[i]];
    const a0 = Math.atan2(p0[1] - cy, p0[0] - cx), a1 = Math.atan2(p1[1] - cy, p1[0] - cx);
    let d = a1 - a0; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    g.beginPath(); g.moveTo(V[i][0], V[i][1]); g.lineTo(V[j][0], V[j][1]); g.lineTo(p0[0], p0[1]);
    g.arc(cx, cy, Rh, a0, a1, d < 0); g.closePath();
    g.fillStyle = color; g.fill();
    g.strokeStyle = line; g.lineWidth = 2; g.stroke();
  }
  // the housing outside the circle, so the corners stay covered when maxR is smaller than the frame
  g.beginPath(); g.rect(-DW, -DH, DW * 3, DH * 3); g.arc(cx, cy, Rh - 1, 0, Math.PI * 2, true);
  g.fillStyle = color; g.fill('evenodd');
  g.restore();
}

// Portal: a circular window onto another world (zero's "whole video inside the period").
// Open the dot instead of zooming the camera into it: a zoom into an off-centre dot swings sideways.
function portal(cx, cy, r, drawInside) {
  if (r <= 0.3) return;
  g.save(); g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip(); drawInside(); g.restore();
}

// One shape, many states. table: [[time, {x, y, w, h, r, fill, ...numbers}], ...] sorted by time.
// Numbers glide, hex colours blend, and you get i (current state) and p (progress into it) so the
// content can swap with swapAlpha(). Retiming the whole morph chain is one edit to the table.
function states(t, table, { dur = 0.8, ease = GLIDE } = {}) {
  const out = {}, first = table[0][1];
  for (const k of Object.keys(first)) {
    if (typeof first[k] === 'number') out[k] = keyed(t, table.map(([tt, s]) => [tt, s[k] ?? first[k]]), { dur, ease });
    else if (/^#[0-9a-f]{6}$/i.test(first[k] ?? '')) {
      const rgb = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
      const ch = [0, 1, 2].map((c) => clamp(keyed(t, table.map(([tt, s]) => [tt, rgb(s[k] ?? first[k])[c]]), { dur, ease }), 0, 255));
      out[k] = `rgb(${ch.map(Math.round).join(',')})`;
    }
  }
  let i = 0; while (i + 1 < table.length && t >= table[i + 1][0]) i++;
  return { ...out, i, p: ease(clamp((t - table[i][0]) / dur)), from: table[i][0], to: table[i + 1]?.[0] ?? Infinity };
}
// Shared-element morph between two boxes {x, y, w, h, r, fill}. p from a spring (may overshoot slightly).
function morphBox(A, B, p) {
  return { x: lerp(A.x, B.x, p), y: lerp(A.y, B.y, p), w: lerp(A.w, B.w, p), h: lerp(A.h, B.h, p),
    r: lerp(A.r ?? 0, B.r ?? 0, p), fill: mixColor(A.fill ?? T.fg, B.fill ?? T.fg, clamp(p)) };
}
function mixColor(c1, c2, p) {
  const h = (c) => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  if (!/^#[0-9a-f]{6}$/i.test(c1) || !/^#[0-9a-f]{6}$/i.test(c2)) return p < 0.5 ? c1 : c2;
  const [a, b] = [h(c1), h(c2)];
  return `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], p))).join(',')})`;
}

// ---------- layers, glass, goo ----------
// Offscreen canvases the size of the frame, reused by name (a cache of elements, not of pixels:
// every frame redraws them, so seek(t) stays a pure function of t).
const _layers = {};
function layerCtx(name) {
  let L = _layers[name];
  if (!L) { const cv = document.createElement('canvas'); L = _layers[name] = cv.getContext('2d'); }
  if (L.canvas.width !== g.canvas.width || L.canvas.height !== g.canvas.height) { L.canvas.width = g.canvas.width; L.canvas.height = g.canvas.height; }
  L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, L.canvas.width, L.canvas.height); L.filter = 'none';
  L.globalAlpha = 1; L.globalCompositeOperation = 'source-over';
  return L;
}
// Run kit drawing code into another context. Needs `let g` (not const) in index.html.
function withCtx(ctx, fn) {
  const prev = g;
  ctx.setTransform(prev.getTransform());
  try { g = ctx; } catch (e) { throw new Error('withCtx/goo need `let g` in index.html, not `const g`'); }
  try { fn(); } finally { g = prev; }
}

// Glass panel (iOS style): a pre-blurred copy of what's behind, clipped to the shape, then a tint
// and a light rim. drawBehind() repaints the backdrop (photo, UI); no backdrop-filter, which
// misreads in headless Chromium. lift grows the shadow with the panel.
// refract > 0 adds the thick-glass edge: a band (refract units wide) along the rim shows the
// backdrop magnified about 6% and barely blurred, so the scene bends at the edge (rossaxbt's recipe).
function glass(x, y, w, h, r, drawBehind, { blur = 18, tint = 'rgba(255,255,255,0.22)', rim = 0.95, edge = 0.1, lift = 1, shadow = true, refract = 0 } = {}) {
  g.save(); alpha(1);
  if (shadow) {
    g.shadowColor = T.shadow; g.shadowBlur = T.shadowBlur * 0.6 * lift * S; g.shadowOffsetY = T.shadowBlur * 0.2 * lift * S;
    rrect(x, y, w, h, r); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill(); g.shadowColor = 'transparent';
  }
  g.save(); rrect(x, y, w, h, r); g.clip();
  g.filter = `blur(${(blur * S).toFixed(2)}px)`; drawBehind(); g.filter = 'none';
  if (refract > 0) {
    g.save(); g.beginPath(); g.roundRect(x, y, w, h, r); g.roundRect(x + refract, y + refract, w - refract * 2, h - refract * 2, Math.max(0, r - refract));
    g.clip('evenodd'); const cx = x + w / 2, cy = y + h / 2;
    g.translate(cx, cy); g.scale(1.06, 1.06); g.translate(-cx, -cy); g.filter = `blur(${(3 * S).toFixed(2)}px)`; drawBehind(); g.restore();
  }
  alpha(1); g.fillStyle = tint; g.fillRect(x, y, w, h);
  // thickness: the inside of the rim darkens a touch, the way a lens edge bends light away
  rrect(x, y, w, h, r); g.strokeStyle = `rgba(0,0,0,${edge})`; g.lineWidth = Math.min(w, h) * 0.12; g.filter = `blur(${(6 * S).toFixed(2)}px)`; g.stroke(); g.filter = 'none';
  const gr = g.createLinearGradient(x, y, x + w * 0.35, y + h);
  gr.addColorStop(0, `rgba(255,255,255,${rim})`); gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, `rgba(255,255,255,${rim * 0.6})`);
  rrect(x + 1, y + 1, w - 2, h - 2, r); g.strokeStyle = gr; g.lineWidth = 2; g.stroke();
  g.restore();
  rrect(x - 0.5, y - 0.5, w + 1, h + 1, r); g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.stroke();
  g.restore();
}

// Goo: shapes drawn in fn() melt together when close and pinch apart when they separate (a pill
// splitting into three, three merging into a Dynamic Island). Blur + alpha threshold, then the
// sharp source is composited back on top so edges and fills stay crisp inside.
function goo(fn, { blur = 14, cut = 0.5 } = {}) {
  const A = layerCtx('gooA'), M = layerCtx('gooB');
  const sa = SA;
  withCtx(A, () => { SA = 1; g.globalAlpha = 1; fn(); });
  SA = sa;
  M.filter = `blur(${(blur * S).toFixed(2)}px)`; M.drawImage(A.canvas, 0, 0); M.filter = 'none';
  const img = M.getImageData(0, 0, M.canvas.width, M.canvas.height), d = img.data, c0 = cut * 255;
  for (let i = 3; i < d.length; i += 4) d[i] = Math.max(0, Math.min(255, (d[i] - c0) * 10 + 128));
  M.putImageData(img, 0, 0);
  M.globalCompositeOperation = 'source-atop'; M.drawImage(A.canvas, 0, 0); M.globalCompositeOperation = 'source-over';
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = SA; g.drawImage(M.canvas, 0, 0); g.restore();
}

// ---------- real footage (screen recordings, B-roll) ----------
// Prepare with `node prep-footage.mjs in.mov name` (JPEG frames + meta.json), declare
// FOOTAGE = { name: 'assets/footage/name' } in index.html, then footage('name', localT, ...).
// Frames load on demand; seekWith() redraws once they arrive, so every frame is exact.
const _foot = { meta: {}, img: new Map(), pending: new Map() };
function loadFootage(dirs) {
  return Promise.all(Object.entries(dirs || {}).map(async ([name, dir]) => {
    const meta = await new Promise((res, rej) => {
      const x = new XMLHttpRequest(); x.open('GET', `${dir}/meta.json`);
      x.onload = () => res(JSON.parse(x.responseText)); x.onerror = () => rej(new Error('missing footage ' + dir)); x.send();
    });
    _foot.meta[name] = { ...meta, dir };
  }));
}
function footageFrame(name, lt, { loop = false, rate = 1 } = {}) {
  const m = _foot.meta[name];
  if (!m) throw new Error(`footage "${name}" not declared in FOOTAGE`);
  let i = Math.floor(Math.max(0, lt * rate) * m.fps + 1e-6);
  i = loop ? i % m.frames : Math.min(m.frames - 1, i);
  const src = `${m.dir}/${String(i + 1).padStart(5, '0')}.jpg`;
  const im = _foot.img.get(src);
  if (im) return im;
  if (!_foot.pending.has(src)) _foot.pending.set(src, new Promise((res) => {
    const x = new Image(); x.onload = () => { _foot.img.set(src, x); _foot.pending.delete(src); res(); };
    x.onerror = () => { _foot.pending.delete(src); res(); }; x.src = src;
  }));
  return null;
}
// Draws footage like shot(): w wide at (x, y), rounded, optional sub-rect src. Returns height.
function footage(name, lt, x, y, w, opts = {}) {
  const m = _foot.meta[name], im = footageFrame(name, lt, opts);
  if (!im) return w * (m.h / m.w);
  if (_foot.img.size > 240) for (const k of [..._foot.img.keys()].slice(0, 120)) _foot.img.delete(k);
  return shot(im, x, y, w, opts);
}
// window.seek = seekWith(draw): draws, waits for any footage frames it asked for, draws again.
const seekWith = (draw) => async (t) => {
  draw(t);
  for (let k = 0; k < 4 && _foot.pending.size; k++) { await Promise.all(_foot.pending.values()); draw(t); }
  return true;
};

// ---------- vector UI (capture-dom.mjs) ----------
// A captured page redrawn as vectors: boxes, borders, shadows, text in the product's own fonts,
// SVG icons; raster only where the page itself is raster (photos, <canvas> charts). Sharp at any
// camera zoom, and every node can move on its own. Declare DOM_PAGES = { dash: 'assets/dom/x.json' }
// and add loadDom(DOM_PAGES) to window.ready.
const DOM = {}, _domFonts = new Set(), _domCv = new Map();
function _xhr(url, type = '') {
  return new Promise((res, rej) => {
    const x = new XMLHttpRequest(); x.open('GET', url); x.responseType = type;
    x.onload = () => res(type ? x.response : x.responseText); x.onerror = () => rej(new Error('missing ' + url)); x.send();
  });
}
// Icons are vector, but canvas rasterizes an <img> at its intrinsic size: declare it 4x so zooms stay crisp.
function _svgURL(markup, w, h) {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml'), el = doc.documentElement;
  el.setAttribute('width', w * 4); el.setAttribute('height', h * 4);
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(el));
}
function loadDom(map) {
  return Promise.all(Object.entries(map || {}).map(async ([name, src]) => {
    const base = new URL(src, location.href), at = (f) => new URL(f, base).href;
    const P = JSON.parse(await _xhr(base.href));
    P.name = name; P.img = {};
    await Promise.all([
      ...(P.fonts || []).map(async (f) => {
        const key = [f.family, f.weight, f.style, f.src].join('|');
        if (_domFonts.has(key)) return;
        _domFonts.add(key);
        const face = new FontFace(f.family, await _xhr(at(f.src), 'arraybuffer'),
          { weight: f.weight || 'normal', style: f.style || 'normal', ...(f.range ? { unicodeRange: f.range } : {}) });
        await face.load(); document.fonts.add(face);
      }),
      ...P.nodes.map((n, i) => {
        const url = n.k === 'svg' ? _svgURL(n.svg, n.w, n.h) : n.file ? at(n.file) : null;
        return url && new Promise((res, rej) => {
          const im = new Image(); im.onload = () => { P.img[i] = im; res(); };
          im.onerror = () => rej(new Error('missing dom image ' + (n.file || 'svg ' + i))); im.src = url;
        });
      }),
    ]);
    DOM[name] = P;
  }));
}
function _rr(x, y, w, h, r) {
  const m = Math.max(0, Math.min(w, h) / 2);
  g.beginPath(); g.roundRect(x, y, Math.max(0, w), Math.max(0, h), (Array.isArray(r) ? r : [r || 0]).map((v) => Math.max(0, Math.min(v, m))));
}
function _domNode(P, n, i) {
  if (n.k === 'text') {
    g.font = n.f; g.fillStyle = n.c; g.letterSpacing = (n.ls || 0) + 'px'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    for (const [t, wx, by] of n.words) g.fillText(t, wx, by);
    return;
  }
  const r = n.r || 0;
  // Shadows: the shape is drawn far off-frame and only its shadow is offset back, so a card with a
  // translucent fill doesn't darken itself. Canvas shadows live in device pixels, hence the matrix.
  for (const s of n.sh || []) {
    const M = g.getTransform(), far = 1e4, sp = s.spread;
    g.save(); g.shadowColor = s.c; g.shadowBlur = s.blur * Math.hypot(M.a, M.b);
    g.shadowOffsetX = M.a * (far + s.x) + M.c * s.y; g.shadowOffsetY = M.b * (far + s.x) + M.d * s.y;
    _rr(n.x - far - sp, n.y - sp, n.w + sp * 2, n.h + sp * 2, (Array.isArray(r) ? r : [r]).map((v) => v + sp));
    g.fillStyle = '#000'; g.fill(); g.restore();
  }
  if (n.bg) { _rr(n.x, n.y, n.w, n.h, r); g.fillStyle = n.bg; g.fill(); }
  const img = P.img[i];
  if (img) { g.save(); _rr(n.x, n.y, n.w, n.h, r); g.clip(); g.drawImage(img, n.x, n.y, n.w, n.h); g.restore(); }
  if (n.bd) {
    const [[t, tc], [rt, rc], [b, bc], [l, lc]] = n.bd;
    if (t === rt && rt === b && b === l && tc === rc && rc === bc && bc === lc) {
      _rr(n.x + t / 2, n.y + t / 2, n.w - t, n.h - t, (Array.isArray(r) ? r : [r]).map((v) => v - t / 2));
      g.strokeStyle = tc; g.lineWidth = t; g.stroke();
    } else {
      if (t && tc) { g.fillStyle = tc; g.fillRect(n.x, n.y, n.w, t); }
      if (b && bc) { g.fillStyle = bc; g.fillRect(n.x, n.y + n.h - b, n.w, b); }
      if (l && lc) { g.fillStyle = lc; g.fillRect(n.x, n.y, l, n.h); }
      if (rt && rc) { g.fillStyle = rc; g.fillRect(n.x + n.w - rt, n.y, rt, n.h); }
    }
  }
}
// Draws page P (a DOM key or object) w units wide at (x, y). region [x, y, w, h] in page px draws
// just that part (a card, the sidebar). each(node, i) returns null to skip a node or { a, dx, dy }
// (page px) to move it: stagger rows in, slide a panel, fade the rest. Returns the drawn height.
function domPage(P, x, y, w, { region, each, bg = true } = {}) {
  if (typeof P === 'string') P = DOM[P];
  const [rx, ry, rw, rh] = region || [0, 0, P.w, P.h];
  g.save();
  g.translate(x, y); g.scale(w / rw, w / rw); g.translate(-rx, -ry);
  g.beginPath(); g.rect(rx, ry, rw, rh); g.clip();
  if (bg) { alpha(1); g.fillStyle = P.bg; g.fillRect(rx, ry, rw, rh); }
  for (let i = 0; i < P.nodes.length; i++) {
    const n = P.nodes[i];
    if (n.x > rx + rw || n.y > ry + rh || n.x + n.w < rx || n.y + n.h < ry) continue;
    let a = 1, dx = 0, dy = 0;
    if (each) { const e = each(n, i); if (!e) continue; a = e.a ?? 1; dx = e.dx || 0; dy = e.dy || 0; }
    if (a * n.o <= 0) continue;
    g.save();
    if (n.clip != null) { const c = P.clips[n.clip]; _rr(c[0], c[1], c[2], c[3], c[4]); g.clip(); }
    g.translate(dx, dy); alpha(a * n.o);
    _domNode(P, n, i);
    g.restore();
  }
  g.restore();
  return rh * (w / rw);
}
// Box of the first text containing `text`, in page px, or in frame units when placed like domPage.
function domFind(P, text, x = 0, y = 0, w, { region } = {}) {
  if (typeof P === 'string') P = DOM[P];
  const n = P.nodes.find((m) => m.k === 'text' && m.words.map((v) => v[0]).join(' ').includes(text));
  if (!n) throw new Error(`"${text}" not found in ${P.name || P.url}`);
  const [rx, ry, rw] = region || [0, 0, P.w], k = (w ?? rw) / rw;
  return { x: x + (n.x - rx) * k, y: y + (n.y - ry) * k, w: n.w * k, h: n.h * k };
}
// The page (or a region) as a canvas, for plane3d() tilts. Static content, so caching it is exact.
function domCanvas(P, { region, scale = 2 } = {}) {
  if (typeof P === 'string') P = DOM[P];
  const key = `${P.name}|${region}|${scale}`;
  if (!_domCv.has(key)) {
    const [, , rw, rh] = region || [0, 0, P.w, P.h], cv = document.createElement('canvas');
    cv.width = Math.round(rw * scale); cv.height = Math.round(rh * scale);
    const sa = SA; SA = 1;
    withCtx(cv.getContext('2d'), () => { g.setTransform(1, 0, 0, 1, 0, 0); domPage(P, 0, 0, cv.width, { region }); });
    SA = sa; _domCv.set(key, cv);
  }
  return _domCv.get(key);
}

// Phone for real mobile captures (capture-mobile.mjs): body, the screen clipped to the device's
// corners, Dynamic Island. drawScreen(x, y, w, h) paints the screen (shot, footage, domPage).
// aspect = screen height / width (1179x2556 captures: 2.168). Returns the height.
function phone(x, y, w, drawScreen, { aspect = 2.168, body = '#0B0B0C', island = true, lift = 1 } = {}) {
  const bz = w * 0.035, sw = w - bz * 2, h = sw * aspect + bz * 2, r = w * 0.16;
  card(x, y, w, h, { r, fill: body, lift });
  g.save(); _rr(x + bz, y + bz, sw, h - bz * 2, r - bz); g.clip();
  drawScreen(x + bz, y + bz, sw, h - bz * 2);
  g.restore();
  if (island) { g.save(); alpha(1); _rr(x + w / 2 - w * 0.15, y + bz + w * 0.03, w * 0.3, w * 0.085, w * 0.0425); g.fillStyle = '#000'; g.fill(); g.restore(); }
  return h;
}

// Laptop for desktop products: lid with bezel and notch, the screen (16:10 by default) clipped to
// the lid, and the base wedge. drawScreen(x, y, w, h) paints the screen. Returns the lid height.
function laptop(x, y, w, drawScreen, { aspect = 0.625, body = '#1C1C1E', base = '#C9CACE', lift = 1 } = {}) {
  const bz = w * 0.018, sw = w - bz * 2, sh = sw * aspect, h = sh + bz * 2.4, r = w * 0.022;
  card(x, y, w, h, { r, fill: body, lift });
  g.save(); _rr(x + bz, y + bz * 1.4, sw, sh, r * 0.4); g.clip();
  drawScreen(x + bz, y + bz * 1.4, sw, sh);
  g.restore();
  g.save(); alpha(1);
  _rr(x + w / 2 - w * 0.045, y + bz * 1.4 - 1, w * 0.09, w * 0.012, w * 0.006); g.fillStyle = body; g.fill();
  const bw = w * 1.14, bx = x - (bw - w) / 2, by = y + h, bh = w * 0.022;
  g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + bw, by); g.lineTo(bx + bw - bh * 0.6, by + bh); g.lineTo(bx + bh * 0.6, by + bh); g.closePath();
  const gr = g.createLinearGradient(0, by, 0, by + bh); gr.addColorStop(0, base); gr.addColorStop(1, mixColor(base, '#000000', 0.35));
  g.fillStyle = gr; g.fill();
  _rr(x + w / 2 - w * 0.08, by, w * 0.16, bh * 0.35, bh * 0.2); g.fillStyle = mixColor(base, '#000000', 0.18); g.fill();
  g.restore();
  return h;
}

// ---------- expert grammar: light, focus, chapters, annotations, in-app motion ----------
// From frame-by-frame study of the 2026-10 references in research.md ("What makes it look made by
// a designer"). Light and focus give the film a world; chapters and callouts make a walkthrough
// read; stack/typingDots/check make the product itself move instead of a cursor poking at it.

const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a)})`; };

// Atmosphere: a base colour lit by 1-3 large, very soft pools of light that drift slowly. Change
// the pool colours per chapter (mixColor or states()) so each section has its own light. This is
// lighting the set, not a glow on an element: pools are huge, low contrast and never pulse.
// pools: [{ x, y (0-1 of the frame), r (0-1 of the long side), color, a }]
function ambient(t, { base = T.bg, pools = [], drift = 0.035, seed = 9 } = {}) {
  g.save(); alpha(1); g.fillStyle = base; g.fillRect(0, 0, DW, DH);
  const r = rng(seed);
  for (const p of pools) {
    const ph = r() * 6.283, w = 0.1 + r() * 0.08;
    const x = (p.x + Math.sin(t * w + ph) * drift) * DW, y = (p.y + Math.cos(t * w * 0.8 + ph) * drift) * DH;
    const R = (p.r ?? 0.45) * Math.max(DW, DH), gr = g.createRadialGradient(x, y, 0, x, y, R);
    gr.addColorStop(0, hexA(p.color, p.a ?? 0.45)); gr.addColorStop(0.55, hexA(p.color, (p.a ?? 0.45) * 0.35)); gr.addColorStop(1, hexA(p.color, 0));
    g.fillStyle = gr; g.fillRect(0, 0, DW, DH);
  }
  g.restore();
}

// Window light falling across a surface (a desk under a phone): soft panes of light with mullion
// shadows, sliding slowly so a still shot breathes. Draw it over the surface, under the device;
// shift `tint` from cool to warm across the film to show time passing.
function gobo(t, { angle = -18, panes = [2, 2], x = 0.18, y = -0.1, size = 0.9, light = 0.22, tint = '#FFFFFF', shade = 0.1, soft = 26, speed = 6 } = {}) {
  g.save(); alpha(1);
  g.fillStyle = `rgba(0,0,0,${shade})`; g.fillRect(0, 0, DW, DH);
  g.filter = `blur(${(soft * S).toFixed(1)}px)`;
  g.translate(x * DW + t * speed, y * DH); g.rotate(angle * Math.PI / 180); g.transform(1, 0, -0.35, 1, 0, 0);
  const W0 = size * DW, H0 = size * DH * 1.2, bar = W0 * 0.035, [cx, cy] = panes;
  const pw = (W0 - bar * (cx - 1)) / cx, ph = (H0 - bar * (cy - 1)) / cy;
  g.globalCompositeOperation = 'screen';
  for (let i = 0; i < cx; i++) for (let j = 0; j < cy; j++) { g.fillStyle = hexA(tint, light); g.fillRect(i * (pw + bar), j * (ph + bar), pw, ph); }
  g.restore();
}

// Night sky for a "while you sleep" chapter: seeded stars that twinkle. Story only (night, done
// tasks turning into stars); never as decoration, which is the banned "particles".
function stars(t, { n = 160, seed = 21, color = '#FFF6D8', size = 2.2, twinkle = 0.5 } = {}) {
  const r = rng(seed); g.save(); g.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x = r() * DW, y = r() * DH, s = size * (0.4 + r() * 0.8), ph = r() * 6.283, f = 0.8 + r() * 1.6;
    alpha((0.35 + 0.65 * r()) * (1 - twinkle + twinkle * (0.5 + 0.5 * Math.sin(t * f + ph))));
    g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// Depth of field from one keyed focus distance: a layer at `depth` blurs by its distance from
// `focus`. Rack focus = key `focus` from one layer's depth to another's with keyed(); the blur
// then follows the lens, never a fade. Use with blurred(depthBlur(d, f), () => ...).
const depthBlur = (depth, focus, { k = 14, max = 22 } = {}) => Math.min(max, Math.abs(depth - focus) * k);

// Words pulled into focus one at a time: each starts soft and slightly large, then lands sharp in
// about 0.35 s. `out` sends them back out of focus (in order) before the next line. This is a lens
// move on short lines (a reply, a question), not a blur-in on a whole frame or a paragraph.
function focusIn(text, x, y, t, { size = 64, weight, color = T.fg, font, stagger = 0.08, dur = 0.35, out, lh = 1.12, align = 'left', blur = 16 } = {}) {
  g.save(); g.font = font || fontD(size, weight ?? T.dw); g.letterSpacing = `${size * T.track}px`; g.textBaseline = 'alphabetic';
  const space = g.measureText(' ').width; let i = 0;
  text.split('\n').forEach((line, li) => {
    const ws = line.split(' '), widths = ws.map((w) => g.measureText(w).width);
    const total = widths.reduce((a, b) => a + b, 0) + space * (ws.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    ws.forEach((w, j) => {
      const pin = glide(t - i * stagger, dur), pout = out === undefined ? 0 : glide(t - out - i * stagger * 0.5, dur * 0.8);
      const p = pin * (1 - pout), cy = y + li * size * lh;
      if (p > 0.01) {
        g.save(); g.translate(cx + widths[j] / 2, cy - size * 0.35); const sc = 1 + (1 - p) * 0.08; g.scale(sc, sc);
        const b = (1 - p) * blur; if (b > 0.1) g.filter = `blur(${(b * S).toFixed(2)}px)`;
        alpha(clamp(p * 1.4)); g.fillStyle = color; g.fillText(w, -widths[j] / 2, size * 0.35); g.restore();
      }
      cx += widths[j] + space; i++;
    });
  });
  g.restore();
}

// A walkthrough chapter, the way product pages set it: a small kicker (accent dot + tracked caps),
// a two-line headline whose first line is light and second line bold, and one short line of body.
// Enters by mask rise; before `out` the whole block dims toward faint for 0.3 s (the viewer feels
// the chapter ending), then leaves through its mask lines.
function chapterBlock(x, y, t, { kicker, light, bold, body, out, size = 76, color = T.fg, dimTo = T.faint, align = 'left', maxBody = 520 } = {}) {
  const dim = out === undefined ? 0 : glide(t - (out - 0.35), 0.3), col = mixColor(color, dimTo, dim);
  const o = out === undefined ? undefined : out;
  if (kicker) {
    const ks = sp(t, 'snappy');
    g.save(); alpha(ks * (1 - (o === undefined ? 0 : glide(t - o, 0.2))));
    g.fillStyle = T.accent; g.beginPath(); g.arc(x + 7, y - size * 1.05 - 7, 7 * clamp(ks, 0, 1.2), 0, Math.PI * 2); g.fill();
    g.font = fontM(18); g.letterSpacing = `${18 * T.mtrack}px`; g.fillStyle = mixColor(T.muted, dimTo, dim); g.textBaseline = 'alphabetic';
    g.fillText(kicker.toUpperCase(), x + 24, y - size * 1.05); g.restore();
  }
  if (light) maskRise(light, x, y, t - 0.06, { size, color: col, align, font: fontD(size, 400), out: o === undefined ? undefined : o - 0.06 });
  if (bold) maskRise(bold, x, y + size * 1.08, t - 0.2, { size, color: col, align, out: o === undefined ? undefined : o - 0.2 });
  if (body) {
    const bs = Math.round(size * 0.3), by = y + size * 1.08 + bs * 2.6;
    g.save(); g.font = fontU(bs, 400); const lines = [[]];
    for (const w of body.split(' ')) { const tryL = [...lines[lines.length - 1], w].join(' '); if (g.measureText(tryL).width > maxBody && lines[lines.length - 1].length) lines.push([w]); else lines[lines.length - 1].push(w); }
    g.restore();
    lines.forEach((ln, i) => maskRise(ln.join(' '), x, by + i * bs * 1.45, t - 0.42 - i * 0.05, { size: bs, color: mixColor(T.muted, dimTo, dim), align, font: fontU(bs, 400), stagger: 0.006, out: o === undefined ? undefined : o - 0.3 }));
  }
}

// Annotation beside the device: a dot lands on the UI element (ax, ay), a hairline draws out to the
// label (lx, ly), then the label pops. Names what the product just did ("Due date found"), so the
// viewer reads the feature without a cursor or a ring. Returns nothing; `out` retracts it.
function callout(text, ax, ay, lx, ly, t, { out, size = 20, color = T.fg, fill = T.panel, line = T.muted } = {}) {
  const pin = sp(t, 'snappy'), pl = glide(t - 0.05, 0.35), pb = sp(t - 0.28, 'snappy');
  const po = out === undefined ? 0 : glide(t - out, 0.3), k = 1 - po;
  if (pin <= 0.001 || k <= 0.001) return;
  g.save(); alpha(k);
  g.strokeStyle = line; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ax, ay); g.lineTo(lerp(ax, lx, pl * k), lerp(ay, ly, pl * k)); g.stroke();
  g.fillStyle = T.accent; g.beginPath(); g.arc(ax, ay, 5 * clamp(pin, 0, 1.3), 0, Math.PI * 2); g.fill();
  if (pb > 0.01) {
    g.font = fontU(size, 600); const w = g.measureText(text).width + size * 1.2, h = size * 2;
    const left = lx < ax ? lx - w : lx;
    g.save(); g.translate(lx, ly); const s = clamp(pb, 0, 1.08) * k; g.scale(s, s); g.translate(-lx, -ly);
    card(left, ly - h / 2, w, h, { r: h / 2, fill, lift: 0.4 });
    alpha(k); g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, left + size * 0.6, ly + 1); g.restore();
  }
  g.restore();
}

// In-app list motion (FLIP): items keep their identity while the order changes, and every item
// glides to its new slot. orders: [[time, ['a', 'b', 'c']], ...]; heights: { a: 120, ... }.
// Returns { a: y, ... } offsets from the list top. An id missing from an order is placed after the
// list (draw it with alpha 0 there, or slide it in).
function stackY(t, orders, heights, { gap = 12, dur = 0.6, ease = GLIDE } = {}) {
  const ids = Object.keys(heights), out = {};
  const slot = (ord, id) => { let y = 0; for (const o of ord) { if (o === id) return y; y += heights[o] + gap; } return y; };
  for (const id of ids) out[id] = keyed(t, orders.map(([tt, ord]) => [tt, slot(ord, id)]), { dur, ease });
  return out;
}

// Three dots that bounce in turn: the product (or a person) is typing.
function typingDots(x, y, t, { size = 10, color = T.muted, gap = 2.2 } = {}) {
  g.save(); g.fillStyle = color;
  for (let i = 0; i < 3; i++) {
    const ph = ((t * 2.4 - i * 0.18) % 1 + 1) % 1, b = Math.sin(Math.PI * clamp(ph / 0.45));
    alpha(0.45 + 0.55 * b); g.beginPath(); g.arc(x + i * size * gap, y - b * size * 0.6, size / 2, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

// A highlighter stroke that draws under (or behind) a phrase, left to right: the product
// understood these words. mode 'under' = thick underline, 'band' = behind the text.
function highlight(x, y, w, h, t, { color = T.accent, a = 0.9, mode = 'under', dur = 0.35 } = {}) {
  const p = glide(t, dur); if (p <= 0) return;
  g.save(); alpha(a); g.fillStyle = color;
  if (mode === 'under') rrect(x, y + h * 0.82, w * p, h * 0.14, h * 0.07); else rrect(x - h * 0.12, y - h * 0.04, (w + h * 0.24) * p, h * 1.08, h * 0.2);
  g.fill(); g.restore();
}

// The request turns into the result: a word from the user's message lifts off as a tag, arcs to
// the field of the result it filled ("friday" -> "Fri, Oct 2"), and lands. Pop the target text in
// when the return value reaches 1. Stagger several tags 0.1 s apart. Returns landing progress 0-1.
function flyTag(text, ax, ay, bx, by, t, { dur = 0.6, arc = -80, size = 18, fill = T.accent, color = T.onAccent } = {}) {
  if (t <= 0) return 0;
  const lift = sp(t, 'snappy'), p = glide(t - 0.12, dur), land = clamp((t - 0.12 - dur * 0.85) / 0.15);
  if (land >= 1) return 1;
  const x = lerp(ax, bx, p), y = lerp(ay, by, p) + arc * 4 * p * (1 - p), s = (1 + 0.12 * clamp(lift, 0, 1.2) * (1 - p)) * (1 - land);
  g.save(); alpha(1); g.font = fontU(size, 600);
  const w = g.measureText(text).width + size * 0.8, h = size * 1.6;
  g.translate(x, y); g.scale(s, s); card(-w / 2, -h / 2, w, h, { r: size * 0.35, fill, lift: 0.3 + 0.7 * (1 - p) });
  alpha(1); g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(text, 0, 1);
  g.restore();
  return land;
}

// Round task checkbox: an empty ring until t = 0, then it fills on a spring and the tick draws.
// pulse > 0 rings outward first (an invitation to tap, as in the "call mom" ending).
function checkDot(x, y, r, t, { color = T.fg, fill = T.accent, tick = T.onAccent, lw = 2, pulse = 0 } = {}) {
  g.save(); alpha(1); g.strokeStyle = color; g.lineWidth = lw;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke();
  for (let i = 0; i < pulse; i++) {
    const pp = clamp((t + pulse * 0.6 - i * 0.6) / 0.6);
    if (pp > 0 && pp < 1) { alpha(1 - pp); g.beginPath(); g.arc(x, y, r * (1 + pp * 0.9), 0, Math.PI * 2); g.stroke(); alpha(1); }
  }
  const s = sp(t, 'snappy');
  if (s > 0.001) {
    g.beginPath(); g.arc(x, y, r * clamp(s, 0, 1.15), 0, Math.PI * 2); g.fillStyle = fill; g.fill();
    const d = glide(t - 0.08, 0.25);
    if (d > 0) {
      const pts = [[-0.42, 0.02], [-0.12, 0.32], [0.45, -0.3]], L1 = Math.hypot(0.3, 0.3), L2 = Math.hypot(0.57, 0.62), L = (L1 + L2) * d;
      g.strokeStyle = tick; g.lineWidth = r * 0.22; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath();
      g.moveTo(x + pts[0][0] * r, y + pts[0][1] * r);
      if (L <= L1) { const q = L / L1; g.lineTo(x + lerp(pts[0][0], pts[1][0], q) * r, y + lerp(pts[0][1], pts[1][1], q) * r); }
      else { const q = (L - L1) / L2; g.lineTo(x + pts[1][0] * r, y + pts[1][1] * r); g.lineTo(x + lerp(pts[1][0], pts[2][0], q) * r, y + lerp(pts[1][1], pts[2][1], q) * r); }
      g.stroke();
    }
  }
  g.restore();
}

// Idle life for a device or card that holds: a slow seeded float and a hint of rotation, so a
// 1.5 s read never freezes. Apply as translate(dx, dy) + rotate(rot) around the object's centre.
function idleFloat(t, { seed = 3, amp = 6, rot = 0.4 } = {}) {
  const r = rng(seed), a = r() * 6.283, b = r() * 6.283;
  return { dx: Math.sin(t * 0.7 + a) * amp, dy: Math.sin(t * 0.9 + b) * amp * 1.2, rot: Math.sin(t * 0.5 + a) * rot * Math.PI / 180 };
}

// Whip pan between two scenes: p 0 -> 1 over about 0.3 s. Both scenes travel together like one
// strip of film; render.mjs's adaptive motion blur turns the move into a streak, so don't add a
// fake one. Use between chapters of a list ("books." -> "reminds." -> "replies."), on a beat.
function whip(p, drawA, drawB, { dir = 'left' } = {}) {
  const e = p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? 16 * p ** 5 : 1 - (-2 * p + 2) ** 5 / 2;   // ease in-out quint
  const v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir], dx = v[0] * DW * e, dy = v[1] * DH * e;
  if (e < 1) { g.save(); g.translate(dx, dy); drawA(); g.restore(); }
  if (e > 0) { g.save(); g.translate(dx - v[0] * DW, dy - v[1] * DH); drawB(); g.restore(); }
}

// ---------- prompt-motion.com product films (research.md, "Prompt Motion library") ----------

// Directional smear for the frames around a hard cut, where render.mjs's motion blur must not
// cross (window.CUTS): n faded copies of fn() offset along (dx, dy) design units. Use on the
// first 2-3 frames after a cut (the shot "arrives smeared") and the last 2-3 before one.
function smear(dx, dy, fn, { n = 10 } = {}) {
  if (Math.hypot(dx, dy) < 0.5) return fn();
  const sa = SA;
  for (let i = 0; i < n; i++) { const k = i / (n - 1) - 0.5; SA = sa * (1 / n) * 1.6; g.save(); g.translate(dx * k, dy * k); fn(); g.restore(); }
  SA = sa;
}

// Zoom streaks: n copies of fn() scaled from 1 to `k` about (cx, cy), fading outward. The end-card
// wordmark that arrives "too big, streaking" and snaps to size (notdwd), or a push through a tile.
function zoomSmear(cx, cy, k, fn, { n = 24 } = {}) {
  if (Math.abs(k - 1) < 0.004) return fn();
  const sa = SA;
  for (let i = n - 1; i >= 0; i--) {
    const q = i / (n - 1), s = 1 + (k - 1) * q; SA = sa * (i === 0 ? 1 : 0.5 * (1 - q) / n * 4);
    g.save(); g.translate(cx, cy); g.scale(s, s); g.translate(-cx, -cy); fn(); g.restore();
  }
  SA = sa;
}

// Huge title made of frosted glass: a blurred, lightened copy of what's behind (drawBehind) clipped
// to the letters, plus a faint rim. For titles set over product art or photos. clip = [x, y, w, h, r]
// (the card) lets the card's edge cut the letters off, as in notdwd's stacked cards.
function glassText(text, x, y, size, drawBehind, { weight = 800, blur = 14, milk = 0.35, align = 'left', rim = 0.5, clip } = {}) {
  g.save(); if (clip) { rrect(...clip); g.clip(); } g.font = fontD(size, weight); g.letterSpacing = `${size * T.track}px`; g.textAlign = align; g.textBaseline = 'alphabetic';
  const L = layerCtx('glassText'); L.save(); L.setTransform(g.getTransform()); L.clearRect(-1e4, -1e4, 2e4, 2e4);
  L.font = g.font; L.letterSpacing = g.letterSpacing; L.textAlign = align; L.textBaseline = 'alphabetic'; L.fillStyle = '#000'; L.fillText(text, x, y);
  L.globalCompositeOperation = 'source-in'; L.filter = `blur(${(blur * S).toFixed(2)}px)`; withCtx(L, drawBehind);
  L.filter = 'none'; L.fillStyle = `rgba(255,255,255,${milk})`; L.fillRect(-1e4, -1e4, 2e4, 2e4); L.restore();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); alpha(1); g.drawImage(L.canvas, 0, 0); g.restore();
  g.strokeStyle = `rgba(255,255,255,${rim})`; g.lineWidth = Math.max(1, size * 0.008); alpha(1); g.strokeText(text, x, y);
  g.restore();
}

// A tile that becomes the whole frame (or the reverse): the rect interpolates to full bleed and its
// radius goes to 0, so a pull-back from a full-bleed shot lands exactly on its tile (a match cut
// with no cut). Returns { x, y, w, h, r }; clip with rrect() and draw the shot inside.
function matchFrame(tile, p, { ease = GLIDE } = {}) {
  const e = ease(clamp(p));
  return { x: lerp(tile.x, 0, e), y: lerp(tile.y, 0, e), w: lerp(tile.w, DW, e), h: lerp(tile.h, DH, e), r: lerp(tile.r ?? 24, 0, e) };
}

// Text in a gradient of the brand colours (the one emphasized word), left to right.
function gradientText(text, x, y, size, colors, { weight, align = 'left' } = {}) {
  g.save(); g.font = fontD(size, weight ?? T.dw); g.letterSpacing = `${size * T.track}px`; g.textAlign = align;
  const w = g.measureText(text).width, x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const gr = g.createLinearGradient(x0, 0, x0 + w, 0); colors.forEach((c, i) => gr.addColorStop(i / Math.max(1, colors.length - 1), c));
  alpha(1); g.fillStyle = gr; g.fillText(text, x, y); g.restore();
  return w;
}

// Cut at peak blur: a shot leaving on a hard cut blurs 1 -> max over its last `dur` seconds and
// the cut lands at the peak; the next shot arrives soft (max -> 0 in about 6 frames). Use with
// blurred(cutBlur(t, B(12)), () => ...) on both sides, and list the cut in window.CUTS.
function cutBlur(t, tCut, { out = 0.13, inn = 0.1, maxOut = 7, maxIn = 24 } = {}) {
  if (t < tCut) return t < tCut - out ? 0 : 1 + (maxOut - 1) * DEPART(clamp((t - tCut + out) / out));
  return maxIn * (1 - ARRIVE(clamp((t - tCut) / inn)));
}

// Satellites that spin in around a centre and lock into place (integrations around an app icon):
// n positions on a ring, spinning `turns` counter-clockwise from a wider radius and decelerating
// into their slots. Returns [{ x, y, s }] (s = scale 0-1); draw your own tiles there.
function orbit(cx, cy, t, n, { r = 216, r0, turns = 0.5, dur = 0.6, start = -Math.PI / 2 } = {}) {
  const p = arrive(t, dur), R = lerp(r0 ?? r * 1.7, r, p), spin = turns * Math.PI * 2 * (1 - p);
  return Array.from({ length: n }, (_, i) => {
    const a = start + (i / n) * Math.PI * 2 - spin;
    return { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R, s: clamp(sp(t - i * 0.03, 'snappy'), 0, 1.1) };
  });
}

// A progress bar that bends into a ring (Taxtello: payment bar -> tax-health gauge). The stroke
// keeps its length and curls with steadily rising curvature, like a real strip: at p = 0 a
// horizontal line from (x, y) of length len, at p = 1 a closed circle of the same circumference
// centred on (cx, cy), starting at 12 o'clock and running clockwise. fill 0-1 draws only part of it.
function bendToRing(x, y, len, cx, cy, p, { color = T.accent, lw = 10, fill = 1, n = 120 } = {}) {
  const e = GLIDE(clamp(p)), R = len / (Math.PI * 2), k = (e * Math.PI * 2) / len;
  const ax = lerp(x, cx, e), ay = lerp(y, cy - R, e), m = Math.max(2, Math.round(n * clamp(fill)));
  g.save(); alpha(1); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath();
  for (let i = 0; i <= m; i++) {
    const s = (i / n) * len, px = ax + (k < 1e-6 ? s : Math.sin(k * s) / k), py = ay + (k < 1e-6 ? 0 : (1 - Math.cos(k * s)) / k);
    i ? g.lineTo(px, py) : g.moveTo(px, py);
  }
  g.stroke(); g.restore();
  return R;
}

// A word revealed outward from one of its letters (the ring that shrinks into the wordmark's "o",
// then the rest of the word opens from it). anchor = index of that letter, shown alone until t = 0
// (draw it only once the ring has landed). Returns the width.
function revealFrom(text, x, y, size, anchor, t, { dur = 0.35, color = T.fg, weight } = {}) {
  g.save(); g.font = fontD(size, weight ?? T.dw); g.letterSpacing = `${size * T.track}px`; g.textBaseline = 'alphabetic';
  const w = g.measureText(text).width, a0 = g.measureText(text.slice(0, anchor)).width, a1 = g.measureText(text.slice(0, anchor + 1)).width;
  const p = arrive(t, dur), l = lerp(a0, 0, p), r = lerp(a1, w, p);
  g.beginPath(); g.rect(x + l, y - size * 1.1, r - l, size * 1.5); g.clip();
  alpha(1); g.fillStyle = color; g.fillText(text, x, y); g.restore();
  return w;
}

// A specular glint: a 4-point star with a horizontal streak that travels from (x0, y0) to (x1, y1)
// over dur and fades. Draw it over a logo whose fill you reveal behind it (wordmark, mask).
function glint(x0, y0, x1, y1, t, { dur = 0.3, size = 60, color = '#FFF6DE' } = {}) {
  if (t < 0 || t > dur + 0.15) return;
  const p = arrive(t, dur), x = lerp(x0, x1, p), y = lerp(y0, y1, p), a = Math.sin(Math.PI * clamp(t / (dur + 0.15)));
  g.save(); g.globalCompositeOperation = 'lighter'; alpha(a); g.translate(x, y);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, size * 0.5); gr.addColorStop(0, hexA(color, 0.9)); gr.addColorStop(1, hexA(color, 0));
  g.fillStyle = gr; g.fillRect(-size, -size, size * 2, size * 2);
  g.fillStyle = hexA(color, 0.9);
  for (const [sx, sy] of [[1, 0.06], [0.06, 1]]) { g.beginPath(); g.ellipse(0, 0, size * sx, size * sy, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = hexA(color, 0.35); g.beginPath(); g.ellipse(0, 0, size * 3, size * 0.03, 0, 0, Math.PI * 2); g.fill();
  g.restore();
}

// Layouts for a set of tiles, and the morph between two of them (scatter -> grid -> orbit ->
// burst -> implode). Each layout is [{ x, y, s, r }] (centre, scale, rotation in radians).
const layouts = {
  grid: (n, cx, cy, { cols = 3, gap = 220 } = {}) => Array.from({ length: n }, (_, i) => ({ x: cx + ((i % cols) - (cols - 1) / 2) * gap, y: cy + (Math.floor(i / cols) - (Math.ceil(n / cols) - 1) / 2) * gap, s: 1, r: 0 })),
  ring: (n, cx, cy, { r = 360, s = 0.7, seed = 4 } = {}) => { const q = rng(seed); return Array.from({ length: n }, (_, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r, s, r: (q() - 0.5) * 0.3 }; }); },
  scatter: (n, cx, cy, { spread = 1.4, seed = 9 } = {}) => { const q = rng(seed); return Array.from({ length: n }, () => ({ x: cx + (q() - 0.5) * DW * spread, y: cy + (q() - 0.5) * DH * spread, s: 0.6 + q() * 0.6, r: (q() - 0.5) * 0.5 })); },
  point: (n, cx, cy) => Array.from({ length: n }, () => ({ x: cx, y: cy, s: 0.05, r: 0 })),
};
function layoutMorph(A, B, p, { stagger = 0.04, dur = 0.8, spin = 0 } = {}) {
  return A.map((a, i) => {
    const b = B[i] || B[B.length - 1], e = GLIDE(clamp((p * (dur + stagger * A.length) - i * stagger) / dur));
    const sw = spin * e * (1 - e) * 4;   // implode: a spiral on the way in
    const x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e), cx = lerp(a.x, b.x, 1), cy = lerp(a.y, b.y, 1);
    return { x: cx + (x - cx) * Math.cos(sw) - (y - cy) * Math.sin(sw), y: cy + (x - cx) * Math.sin(sw) + (y - cy) * Math.cos(sw), s: lerp(a.s, b.s, e), r: lerp(a.r, b.r, e) + sw, e };
  });
}

// A settings slider that drives the output: label, track, knob and a ticking readout. active
// rows read black, the rest grey. value 0-1 (animate it with keyed()).
function slider(x, y, w, value, { label = '', active = true, unit = '%', size = 22, accent = T.fg } = {}) {
  g.save(); alpha(1); g.font = fontU(size, 600); g.textBaseline = 'alphabetic';
  g.fillStyle = active ? T.fg : T.faint; g.fillText(label, x, y);
  const txt = `${Math.round(frameLocalValue(value) * 100)}${unit}`; g.font = fontM(size * 0.9); g.textAlign = 'right'; g.fillText(txt, x + w, y);
  const ty = y + size * 1.1; rrect(x, ty, w, 6, 3); g.fillStyle = mixColor(T.faint, T.bg, 0.5); g.fill();
  rrect(x, ty, w * clamp(value), 6, 3); g.fillStyle = active ? accent : T.faint; g.fill();
  card(x + w * clamp(value) - 14, ty - 11, 28, 28, { r: 14, fill: '#FFFFFF', lift: active ? 0.6 : 0.3 });
  g.restore();
}
const frameLocalValue = (v) => v;   // readouts follow the knob; keep as a hook for frame-stepped counters

// Box of a word (or any substring) inside a line of text, so the word itself can become the next
// object: an accent word -> solid bar -> button -> window (morphBox from this rect), or the
// period that turns into a hotspot. Returns { x, y, w, h, cx, cy } in design units.
function textRect(line, part, x, y, size, { weight, font, align = 'left', from = 0 } = {}) {
  g.save(); g.font = font || fontD(size, weight ?? T.dw); g.letterSpacing = `${size * T.track}px`;
  const W = g.measureText(line).width, x0 = align === 'center' ? x - W / 2 : align === 'right' ? x - W : x;
  const i = Math.max(0, line.indexOf(part, from)), a = g.measureText(line.slice(0, i)).width, w = g.measureText(part).width;
  g.restore();
  const r = { x: x0 + a, y: y - size * 0.78, w, h: size * 0.98 };
  return { ...r, cx: r.x + w / 2, cy: r.y + r.h / 2 };
}

// Cause -> effect: a curved line draws from where the user acts (the caret, a button) to the
// result it produces (the rendered element, the new row), a dot rides it, then the target pops.
// Returns arrival 0-1 so the caller can pop/highlight the target when it reaches 1.
function connector(ax, ay, bx, by, t, { dur = 0.45, curve = 0.3, color = T.accent, lw = 2.5, dot = true, dash, out } = {}) {
  if (t <= 0) return 0;
  const p = arrive(t, dur), k = out === undefined ? 1 : 1 - glide(t - out, 0.3);
  if (k <= 0) return 1;
  const mx = (ax + bx) / 2 - (by - ay) * curve, my = (ay + by) / 2 + (bx - ax) * curve;
  const at = (u) => [(1 - u) ** 2 * ax + 2 * (1 - u) * u * mx + u * u * bx, (1 - u) ** 2 * ay + 2 * (1 - u) * u * my + u * u * by];
  g.save(); alpha(k); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round'; if (dash) g.setLineDash(dash);
  g.beginPath(); for (let i = 0; i <= 48; i++) { const u = (i / 48) * p, [px, py] = at(u); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
  g.setLineDash([]); g.fillStyle = color;
  g.beginPath(); g.arc(ax, ay, lw * 1.6, 0, Math.PI * 2); g.fill();
  if (dot && p < 0.999) { const [px, py] = at(p); g.beginPath(); g.arc(px, py, lw * 2.4, 0, Math.PI * 2); g.fill(); }
  g.restore();
  return p;
}

// One status card replaced in place every `every` seconds (step 1 of 6 -> 2 of 6 ...): the old
// card sinks back (scale 0.95, up, soft, fading) while the new one slides up into its slot.
// drawCard(i, x, y) draws card i with its top-left at (x, y). Returns the current index.
function cardSwap(t, n, x, y, drawCard, { every = 0.5, dur = 0.3, rise = 40 } = {}) {
  if (t < 0) return -1;
  const i = Math.min(n - 1, Math.floor(t / every)), lt = t - i * every, p = arrive(lt, dur);
  if (i > 0 && p < 1) {
    blurred(4 * p, () => withAlpha(1 - p, () => { g.save(); g.translate(x, y - rise * 0.3 * p); g.scale(1 - 0.05 * p, 1 - 0.05 * p); drawCard(i - 1, 0, 0); g.restore(); }));
  }
  withAlpha(i === 0 ? arrive(lt, dur) : clamp(p * 1.5), () => drawCard(i, x, y + rise * (1 - p)));
  return i;
}

// Swap one value for the next by pushing it out of its slot (a stat replacing a stat, a ticker
// word): the old leaves along dir, the new enters behind it, with a few fading echoes trailing
// the move. p 0 -> 1 over about 0.25 s.
function pushSwap(p, drawOld, drawNew, { dir = 'up', dist = 140, echoes = 3 } = {}) {
  const v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir], e = p <= 0 ? 0 : p >= 1 ? 1 : 1 - (1 - p) ** 4;
  const off = (k) => [v[0] * dist * k, v[1] * dist * k];
  if (e < 1) withAlpha(1 - e, () => { const [dx, dy] = off(e); g.save(); g.translate(dx, dy); drawOld(); g.restore(); });
  if (e > 0) {
    for (let j = echoes; j >= 1; j--) { const k = e - 1 - j * 0.12 * (1 - e); withAlpha(0.22 * (1 - e) / j, () => { const [dx, dy] = off(k); g.save(); g.translate(dx, dy); drawNew(); g.restore(); }); }
    withAlpha(clamp(e * 1.6), () => { const [dx, dy] = off(e - 1); g.save(); g.translate(dx, dy); drawNew(); g.restore(); });
  }
}

// Slanted multi-band wipe: 2-4 parallel bands in tones of the brand sweep across at an angle,
// a couple of frames apart; the next scene is revealed behind the last band. p 0 -> 1 (~0.25 s).
function bandWipe(p, drawNext, { angle = -65, colors = [T.fg, T.accent, mixColor(T.accent, '#FFFFFF', 0.5)], width = 0.35, lag = 0.12 } = {}) {
  const a = angle * Math.PI / 180, L = Math.hypot(DW, DH), n = colors.length;
  const span = L * (1 + width * n), pos = (k) => -L / 2 - width * L + span * GLIDE(clamp((p - k * lag) / (1 - lag * (n - 1))));
  g.save(); g.translate(DW / 2, DH / 2); g.rotate(a + Math.PI / 2);
  const reveal = pos(n - 1);
  g.save(); g.beginPath(); g.rect(-L, -L, reveal + L, L * 2); g.clip(); g.rotate(-(a + Math.PI / 2)); g.translate(-DW / 2, -DH / 2); drawNext(); g.restore();
  colors.forEach((c, k) => { const x1 = pos(k), x0 = k === n - 1 ? x1 - width * L * 0.35 : pos(k + 1); if (x1 > x0) { alpha(1); g.fillStyle = c; g.fillRect(x0, -L, x1 - x0, L * 2); } });
  g.restore();
}

// Scan: a soft light bar sweeps down a region, and detection boxes (corner brackets + label) pop
// as it passes them. boxes: [{ x, y, w, h, label }] in design units. Returns the bar's y.
function scan(x, y, w, h, t, { dur = 0.6, boxes = [], color = T.accent, size = 16 } = {}) {
  if (t < 0) return y;
  const by = y + h * glide(t, dur);
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  if (t < dur + 0.1) { const gr = g.createLinearGradient(0, by - 60, 0, by + 4); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,0.7)'); alpha(clamp((dur + 0.1 - t) * 6)); g.fillStyle = gr; g.fillRect(x, by - 60, w, 64); }
  g.restore();
  for (const b of boxes) {
    const s = sp(t - (b.y - y) / h * dur, 'snappy'); if (s <= 0.001) continue;
    g.save(); alpha(1); g.strokeStyle = color; g.lineWidth = 2.5; const c = Math.min(b.w, b.h) * 0.22 * clamp(s, 0, 1.1);
    for (const [px, py, sx, sy] of [[b.x, b.y, 1, 1], [b.x + b.w, b.y, -1, 1], [b.x, b.y + b.h, 1, -1], [b.x + b.w, b.y + b.h, -1, -1]]) { g.beginPath(); g.moveTo(px, py + sy * c); g.lineTo(px, py); g.lineTo(px + sx * c, py); g.stroke(); }
    if (b.label) { g.font = fontU(size, 600); const lw = g.measureText(b.label).width + size; rrect(b.x, b.y - size * 1.9, lw * clamp(s, 0, 1), size * 1.5, size * 0.4); g.fillStyle = color; g.fill(); if (s > 0.6) { g.fillStyle = T.onAccent; g.textBaseline = 'middle'; g.fillText(b.label, b.x + size / 2, b.y - size * 1.15); } }
    g.restore();
  }
  return by;
}

// A caption whose words light up as they are spoken (karaoke): words in grey, the spoken ones in
// colour, the current one in the accent. times = start time of each word (from the voice timing).
function karaoke(text, times, x, y, t, { size = 34, color = T.fg, dim = T.faint, accent = T.accent, align = 'center', weight = 600 } = {}) {
  const ws = text.split(' ');
  g.save(); g.font = fontU(size, weight); const space = g.measureText(' ').width, widths = ws.map((w) => g.measureText(w).width);
  const W = widths.reduce((a, b) => a + b, 0) + space * (ws.length - 1); let cx = align === 'center' ? x - W / 2 : x;
  ws.forEach((w, i) => {
    const on = t >= times[i], cur = on && (i === ws.length - 1 || t < times[i + 1]);
    alpha(1); g.fillStyle = cur ? accent : on ? color : dim; g.fillText(w, cx, y); cx += widths[i] + space;
  });
  g.restore();
}

// Floor reflection: fn() mirrored below floorY, fading out over `fade` units (a carousel of cards
// or a device standing on a glossy surface).
function reflection(floorY, fn, { a = 0.22, fade = 220 } = {}) {
  const L = layerCtx('reflect');
  withCtx(L, () => { g.translate(0, floorY * 2); g.scale(1, -1); fn(); });
  L.save(); L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'destination-in';
  const y0 = floorY * S, gr = L.createLinearGradient(0, y0, 0, y0 + fade * S); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  L.fillStyle = gr; L.fillRect(0, 0, L.canvas.width, L.canvas.height); L.restore();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); alpha(1); g.drawImage(L.canvas, 0, 0); g.restore();
}

// Odometer: each digit column rolls to its value, low digits spinning fastest (the hero number
// that survives three scenes: counter -> dashboard tab -> invoice row). Digits sit in a clip;
// commas and symbols stay put. Reads frame time so digits never smear. Returns the width.
function odometer(value, x, y, t, { from = 0, dur = 1.2, size = 64, color = T.fg, font, align = 'left', decimals = 0, prefix = '', suffix = '' } = {}) {
  const lt = frameLocal(t), fmt = (v) => prefix + v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  const target = fmt(value), chars = [...target];
  g.save(); g.font = font || fontM(size); g.textBaseline = 'alphabetic';
  const dw = g.measureText('0').width, W = chars.reduce((a, c) => a + (/\d/.test(c) ? dw : g.measureText(c).width), 0);
  let cx = align === 'center' ? x - W / 2 : align === 'right' ? x - W : x;
  g.beginPath(); g.rect(cx - 4, y - size * 0.92, W + 8, size * 1.18); g.clip(); alpha(1); g.fillStyle = color;
  const digits = chars.filter((c) => /\d/.test(c)).length; let di = 0;
  for (const c of chars) {
    if (!/\d/.test(c)) { g.fillText(c, cx, y); cx += g.measureText(c).width; continue; }
    const place = digits - 1 - di, d = +c, start = Math.floor(from / 10 ** place) % 10;
    const turns = Math.min(3, place === 0 ? 3 : place === 1 ? 2 : place === 2 ? 1 : 0);
    const total = (d - start + 10) % 10 + turns * 10, p = arrive(lt - di * 0.04, dur);
    const pos = start + total * p, k = Math.floor(pos), f = pos - k;
    for (const [n, off] of [[k % 10, -f], [(k + 1) % 10, 1 - f]]) g.fillText(String(n), cx, y + off * size * 1.1);
    cx += dw; di++;
  }
  g.restore();
  return W;
}

// A fixed sentence with one slot whose word keeps changing ("market your app -> SaaS -> brand"):
// the old word rises out soft, the new one rises in, the slot width glides, and the last word
// lands in `last` colour. before/after are the fixed parts. Returns the full width.
function rotateWord(before, slotWords, after, x, y, t, { hold = 0.35, swap = 0.16, size = 64, color = T.fg, dim = T.muted, last = T.fg, weight, align = 'left' } = {}) {
  g.save(); g.font = fontD(size, weight ?? T.dw); g.letterSpacing = `${size * T.track}px`;
  const per = hold + swap, n = slotWords.length, i = Math.max(0, Math.min(n - 1, Math.floor(t / per))), lt = t - i * per;
  const p = i === n - 1 && lt > swap ? 1 : clamp(lt / swap), e = ARRIVE(p);
  const wOf = (s) => g.measureText(s).width, slotW = lerp(wOf(slotWords[Math.max(0, i - 1)]), wOf(slotWords[i]), i === 0 ? 1 : e);
  const W = wOf(before) + slotW + wOf(after);
  let cx = align === 'center' ? x - W / 2 : x;
  alpha(1); g.fillStyle = color; g.fillText(before, cx, y); cx += wOf(before);
  g.save(); g.beginPath(); g.rect(cx - 4, y - size * 1.0, Math.max(wOf(slotWords[i]), slotW) + 8, size * 1.3); g.clip();
  if (i > 0 && e < 1) blurred(6 * e, () => { alpha(1 - e); g.fillStyle = dim; g.fillText(slotWords[i - 1], cx, y - size * 0.9 * e); });
  blurred(i === 0 ? 0 : 6 * (1 - e), () => { alpha(i === 0 ? 1 : e); g.fillStyle = i === n - 1 ? mixColor(dim, last, e) : dim; g.fillText(slotWords[i], cx, y + (i === 0 ? 0 : size * 0.9 * (1 - e))); });
  g.restore(); cx += slotW;
  alpha(1); g.fillStyle = color; g.fillText(after, cx, y);
  g.restore();
  return W;
}

// Area chart that draws itself left to right with a glowing head dot; scrub (0-1 or null) adds a
// crosshair with a tooltip. data = values; recolour by passing a mixColor() as color between tabs.
function areaChart(data, x, y, w, h, p, { color = T.accent, lw = 3, fillA = 0.18, scrub = null, tip, min, max } = {}) {
  const lo = min ?? Math.min(...data), hi = max ?? Math.max(...data), n = data.length - 1;
  const pt = (u) => { const f = u * n, i = Math.min(n - 1, Math.floor(f)), k = f - i, v = lerp(data[i], data[i + 1], k); return [x + u * w, y + h - ((v - lo) / (hi - lo || 1)) * h]; };
  const e = arrive(p, 1), steps = Math.max(2, Math.round(120 * e));
  if (e <= 0) return;
  const toHex = (c) => (c[0] === '#' ? c : '#' + c.match(/\d+/g).slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join(''));
  g.save(); alpha(1);
  g.beginPath(); g.moveTo(x, y + h); for (let i = 0; i <= steps; i++) g.lineTo(...pt((i / steps) * e)); g.lineTo(x + w * e, y + h); g.closePath();
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, hexA(toHex(color), fillA)); gr.addColorStop(1, hexA(toHex(color), 0)); g.fillStyle = gr; g.fill();
  g.beginPath(); for (let i = 0; i <= steps; i++) { const [px, py] = pt((i / steps) * e); i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
  if (e < 0.999) { const [hx, hy] = pt(e), hg = g.createRadialGradient(hx, hy, 0, hx, hy, lw * 6); hg.addColorStop(0, hexA(toHex(color), 0.6)); hg.addColorStop(1, hexA(toHex(color), 0)); g.fillStyle = hg; g.fillRect(hx - lw * 6, hy - lw * 6, lw * 12, lw * 12); g.fillStyle = color; g.beginPath(); g.arc(hx, hy, lw * 1.4, 0, Math.PI * 2); g.fill(); }
  if (scrub != null && e >= 0.999) {
    const [sx, sy] = pt(clamp(scrub)); g.strokeStyle = hexA(toHex(T.fg), 0.25); g.lineWidth = 1; g.beginPath(); g.moveTo(sx, y); g.lineTo(sx, y + h); g.stroke();
    g.fillStyle = color; g.beginPath(); g.arc(sx, sy, lw * 1.8, 0, Math.PI * 2); g.fill();
    if (tip) { g.font = fontM(18); const tw = g.measureText(tip).width + 24; card(sx - tw / 2, sy - 58, tw, 38, { r: 10, lift: 0.4 }); alpha(1); g.fillStyle = T.fg; g.textBaseline = 'middle'; g.fillText(tip, sx - tw / 2 + 12, sy - 39); }
  }
  g.restore();
}

// Design-tool selection on a UI element: bounding box, 8 handles and a size pill, snapping in
// from 1.12x. Says "this is the thing" more precisely than a ring.
function selectionBox(x, y, w, h, t, { color = '#2F80FF', label, out } = {}) {
  const s = sp(t, 'snappy'), k = out === undefined ? 1 : 1 - glide(t - out, 0.2); if (s <= 0.001 || k <= 0.001) return;
  const z = 1 + 0.12 * (1 - clamp(s)), cx = x + w / 2, cy = y + h / 2;
  g.save(); alpha(k); g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy);
  g.strokeStyle = color; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
  for (const [px, py] of [[x, y], [cx, y], [x + w, y], [x, cy], [x + w, cy], [x, y + h], [cx, y + h], [x + w, y + h]]) { g.fillStyle = '#FFFFFF'; g.fillRect(px - 5, py - 5, 10, 10); g.strokeRect(px - 5, py - 5, 10, 10); }
  const txt = label ?? `${Math.round(w)} × ${Math.round(h)}`; g.font = fontU(15, 600); const tw = g.measureText(txt).width + 16;
  rrect(cx - tw / 2, y + h + 12, tw, 26, 6); g.fillStyle = color; g.fill(); g.fillStyle = '#FFFFFF'; g.textBaseline = 'middle'; g.fillText(txt, cx - tw / 2 + 8, y + h + 25.5);
  g.restore();
}

// Rows of items (integrations, customer logos, feature names) sliding in alternating directions,
// wrapped seamlessly. drawItem(item, x, y) draws one item and returns its width.
function marquee(rows, x, y, w, t, drawItem, { rowH = 90, speed = 60, gap = 40 } = {}) {
  g.save(); g.beginPath(); g.rect(x, y, w, rows.length * rowH); g.clip();
  rows.forEach((items, r) => {
    const L = layerCtx('mq'); let span = 0; withCtx(L, () => { for (const it of items) span += drawItem(it, -1e5, -1e5) + gap; });
    const dir = r % 2 ? 1 : -1, off = ((t * speed * dir) % span + span) % span;
    for (let rep = -1; rep <= Math.ceil(w / span) + 1; rep++) { let cx = x - off + rep * span; for (const it of items) cx += drawItem(it, cx, y + r * rowH + rowH / 2) + gap; }
  });
  g.restore();
}

// Slot reel: a vertical strip of n cells spins with motion blur and decelerates onto `land`.
// drawCell(i, x, y, w, h) draws cell i. Returns true once it has landed (add checkDot / border).
function reel(n, land, x, y, w, h, t, drawCell, { dur = 1.3, spins = 3 } = {}) {
  const p = arrive(t, dur), pos = (land + spins * n) * p, k = Math.floor(pos), f = pos - k;
  g.save(); rrect(x, y, w, h, 20); g.clip();
  for (const j of [-1, 0, 1]) drawCell(((k + j) % n + n) % n, x, y + (j - f) * h, w, h);
  g.restore();
  return p >= 0.999;
}

// Step index for image runs on a musical subdivision (16th notes at 120 BPM = 0.125 s): which of
// n images shows at t. Pair every step with a click cue from stepTimes().
const stepIndex = (t, start, step = 0.125, n = 1) => Math.max(0, Math.min(n - 1, Math.floor(frameLocal(t - start) / step)));
const stepTimes = (start, step, n) => Array.from({ length: n }, (_, i) => start + i * step);

// ---------- optional character ----------
// Box mascot with fixed proportions. squash -1..1 (negative = stretch), look = [-1..1, -1..1].
// Blinks on a seeded schedule; draw on downbeats for reactions (bounce, look at the cursor).
function mascot(x, y, size, t, { color = T.accent, look = [0, 0], squash = 0, seed = 7, smile = 1 } = {}) {
  const blinks = []; const r = rng(seed); for (let bt = 0.8; bt < 600; bt += 2.2 + r() * 2.4) blinks.push(bt);
  const near = Math.min(...blinks.map((b) => Math.abs(t - b)));
  const lid = near < 0.09 ? near / 0.09 : 1;
  g.save(); alpha(1); g.translate(x, y);
  g.scale(1 + squash * 0.22, 1 - squash * 0.22);
  g.translate(0, -size / 2);
  rrect(-size / 2, -size / 2, size, size, size * 0.24); g.fillStyle = color; g.fill();
  const ex = size * 0.19, ey = -size * 0.06, er = size * 0.1;
  for (const s of [-1, 1]) {
    g.save(); g.translate(s * ex + look[0] * er * 0.5, ey + look[1] * er * 0.4); g.scale(1, Math.max(0.08, lid));
    g.beginPath(); g.arc(0, 0, er, 0, Math.PI * 2); g.fillStyle = '#FFFFFF'; g.fill();
    g.beginPath(); g.arc(look[0] * er * 0.4, look[1] * er * 0.4, er * 0.55, 0, Math.PI * 2); g.fillStyle = '#0B0B0A'; g.fill();
    g.restore();
  }
  if (smile) { g.beginPath(); g.arc(0, size * 0.12, size * 0.1 * smile, 0.15 * Math.PI, 0.85 * Math.PI); g.strokeStyle = '#0B0B0A'; g.lineWidth = size * 0.035; g.lineCap = 'round'; g.stroke(); }
  g.restore();
}
