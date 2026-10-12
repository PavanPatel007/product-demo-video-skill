// Classic script (not a module) so index.html works over file:// in headless Chrome.
// Everything here is a pure function of time: seek(t) must paint the same frame every run.
(function (root) {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, p) => a + (b - a) * p;

  // Closed-form damped spring, 0 -> 1. k = stiffness, d = damping.
  function spring(t, k = 170, d = 26) {
    if (t <= 0) return 0;
    const w0 = Math.sqrt(k), z = d / (2 * w0);
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
    }
    return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  }

  const SPRINGS = {
    snappy: [320, 30],   // buttons, toggles, leading edges (tiny overshoot)
    base: [170, 26],     // cards, containers, camera
    heavy: [120, 24],    // big type, screenshots, logo lockups (no overshoot)
    playful: [200, 14],  // mascots, stickers (visible overshoot)
  };
  const sp = (t, name = 'base') => spring(t, ...SPRINGS[name]);

  // A value that changes target several times: one spring per change, summed.
  // keys: [[time, value], ...] sorted by time.
  function track(t, keys, k = 170, d = 26) {
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++)
      v += (keys[i][1] - keys[i - 1][1]) * spring(t - keys[i][0], k, d);
    return v;
  }

  // Tab indicator that stretches: leading edge stiffer than trailing edge.
  function indicator(t, stops, width = 120) {
    const lead = track(t, stops, 320, 30);
    const trail = track(t, stops, 140, 22);
    return { left: Math.min(lead, trail), right: Math.max(lead, trail) + width };
  }

  // Text inside a morphing box: enters after the morph starts, leaves before the next one.
  const swapAlpha = (t, tIn, tOut) =>
    Math.min(clamp((t - tIn - 0.08) / 0.12), clamp((tOut - 0.1 - t) / 0.1));

  const loopT = (t, dur) => ((t % dur) + dur) % dur;

  // CSS-style cubic-bezier easing, solved in closed form per call (Newton + bisection fallback).
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = (s) => ((ax * s + bx) * s + cx) * s, Y = (s) => ((ay * s + by) * s + cy) * s;
    const dX = (s) => (3 * ax * s + 2 * bx) * s + cx;
    return (p) => {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      let s = p;
      for (let i = 0; i < 8; i++) { const e = X(s) - p, d = dX(s); if (Math.abs(e) < 1e-6) return Y(s); if (Math.abs(d) < 1e-6) break; s -= e / d; }
      let lo = 0, hi = 1; s = p;
      for (let i = 0; i < 30; i++) { const x = X(s); if (Math.abs(x - p) < 1e-6) break; if (x < p) lo = s; else hi = s; s = (lo + hi) / 2; }
      return Y(s);
    };
  }
  // The glide every morph and camera move rides in zero's loop films: no overshoot, long settle.
  const GLIDE = bezier(0.45, 0, 0.15, 1);
  const glide = (t, dur = 0.8) => GLIDE(clamp(t / dur));

  // Piecewise value from a table of [time, value] keys, each segment eased over `dur` seconds
  // starting at its key. Retiming a whole sequence is one edit to the table.
  function keyed(t, keys, { dur = 0.8, ease = GLIDE } = {}) {
    let v = keys[0][1];
    for (let i = 1; i < keys.length; i++) v += (keys[i][1] - keys[i - 1][1]) * ease(clamp((t - keys[i][0]) / dur));
    return v;
  }

  // Zoom interpolated in log space, so 1x -> 4x feels as even as 4x -> 16x.
  const logLerp = (a, b, p) => Math.exp(lerp(Math.log(a), Math.log(b), p));

  // A circle that opens or closes evenly by area: radius from an area fraction.
  const byArea = (p) => Math.sqrt(clamp(p, 0, 1.2));

  // Seeded noise (mulberry32). Never Math.random.
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Frame time. render.mjs sets __t (the subframe being drawn) and __ft (the frame it belongs to)
  // before every seek. Text that changes in steps (counters, typing, scramble) reads frameLocal()
  // so its glyphs stay identical across a frame's subframes instead of smearing in the blur.
  const frameLocal = (t) => (root.__ft == null || root.__t == null ? t : t - (root.__t - root.__ft));

  Object.assign(root, { clamp, lerp, spring, SPRINGS, sp, track, indicator, swapAlpha, loopT, rng,
    bezier, GLIDE, glide, keyed, logLerp, byArea, frameLocal });
})(globalThis);
