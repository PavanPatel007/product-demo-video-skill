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
// vanish right to left. Seeded: same frame every run.
function scramble(text, x, y, t, { size = 28, dur = 0.6, color = T.fg, font, seed = 3, align = 'left', out, set = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*' } = {}) {
  if (t <= 0) return 0;
  if (out !== undefined && t > out) {
    const n = text.length, gone = Math.floor(((t - out) / (dur * 0.6)) * n);
    if (gone >= n) return 0;
    return scramble(text.slice(0, n - gone), x, y, dur * 0.5, { size, dur, color, font, seed: seed + Math.floor((t - out) * 30), align, set });
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

// Typed text with a caret that blinks only when idle. Returns the visible width.
function typeOn(text, x, y, t, { cps = 22, size = 32, color = T.fg, font, caret = true } = {}) {
  if (t <= 0) return 0;
  g.save();
  g.font = font || fontU(size); g.letterSpacing = '0px'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const n = Math.min(text.length, Math.floor(t * cps));
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

// Number that counts up with an ease-out; mono face keeps digits from jittering.
function countUp(from, to, x, y, t, { dur = 1, size = 64, color = T.fg, decimals = 0, prefix = '', suffix = '', align = 'left', font } = {}) {
  const p = 1 - Math.pow(1 - clamp(t / dur), 3);
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

// ---------- UI primitives (rebuild real UI with the product's real copy and colors) ----------
function card(x, y, w, h, { r = 20, fill = T.panel, shadow = true, stroke } = {}) {
  g.save(); alpha(1);
  if (shadow) { g.shadowColor = T.shadow; g.shadowBlur = T.shadowBlur; g.shadowOffsetY = T.shadowBlur * 0.3; }
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
    g.shadowColor = T.shadow; g.shadowBlur = T.shadowBlur; g.shadowOffsetY = T.shadowBlur * 0.35;
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
// Flood: a shape grows from (cx, cy) past every corner. Drive p 0->1 over ~0.3 s.
function flood(cx, cy, p, { color = T.fg } = {}) {
  if (p <= 0) return;
  const R = Math.hypot(Math.max(cx, DW - cx), Math.max(cy, DH - cy)) * 1.06;
  g.save(); alpha(1); g.fillStyle = color; g.beginPath(); g.arc(cx, cy, R * clamp(p, 0, 1.2), 0, Math.PI * 2); g.fill(); g.restore();
}
// Contract: the flood colour covers everything except a growing hole at (cx, cy). p 0 -> 1 opens it.
function contract(cx, cy, p, { color = T.fg } = {}) {
  if (p >= 1) return;
  const R = Math.hypot(Math.max(cx, DW - cx), Math.max(cy, DH - cy)) * 1.06;
  g.save(); alpha(1); g.fillStyle = color; g.beginPath(); g.rect(-DW, -DH, DW * 3, DH * 3);
  g.arc(cx, cy, Math.max(0, R * p), 0, Math.PI * 2, true); g.fill('evenodd'); g.restore();
}
// Iris: a six-blade aperture opens onto whatever drawInside() paints. p 0 -> 1.
function iris(cx, cy, p, drawInside, { blades = 6, maxR } = {}) {
  const R = (maxR ?? Math.hypot(DW, DH) * 0.62) * clamp(p, 0, 1.1);
  if (R <= 0.5) return;
  g.save(); g.beginPath();
  for (let i = 0; i <= blades; i++) {
    const an = (i / blades) * Math.PI * 2 + (1 - clamp(p)) * 1.1;
    (i ? g.lineTo : g.moveTo).call(g, cx + Math.cos(an) * R, cy + Math.sin(an) * R);
  }
  g.clip(); drawInside(); g.restore();
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
