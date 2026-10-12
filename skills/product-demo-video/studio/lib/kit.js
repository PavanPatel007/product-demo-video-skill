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
function cursor(x, y, press = 0, a = 1) {
  g.save(); alpha(a);
  g.translate(x, y); g.scale(1.25 * (1 - 0.15 * press), 1.25 * (1 - 0.15 * press));
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

// Cursor path through [[t, x, y], ...] with a press at each `clicks` time. Returns {x, y, press}.
function cursorPath(t, keys, clicks = []) {
  const x = track(t, keys.map(([k, kx]) => [k, kx]), 170, 26);
  const y = track(t, keys.map(([k, , ky]) => [k, ky]), 170, 26);
  const press = Math.max(0, ...clicks.map((c) => clamp(1 - Math.abs(t - c) / 0.1)));
  return { x, y, press };
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
function glass(x, y, w, h, r, drawBehind, { blur = 18, tint = 'rgba(255,255,255,0.22)', rim = 0.95, edge = 0.1, lift = 1, shadow = true } = {}) {
  g.save(); alpha(1);
  if (shadow) {
    g.shadowColor = T.shadow; g.shadowBlur = T.shadowBlur * 0.6 * lift * S; g.shadowOffsetY = T.shadowBlur * 0.2 * lift * S;
    rrect(x, y, w, h, r); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fill(); g.shadowColor = 'transparent';
  }
  g.save(); rrect(x, y, w, h, r); g.clip();
  g.filter = `blur(${(blur * S).toFixed(2)}px)`; drawBehind(); g.filter = 'none';
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
