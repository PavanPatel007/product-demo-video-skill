// Browser side of capture-dom.mjs: turns the visible page into vector drawing data for kit.js
// domPage(). Also works in an agent's own browser tool: evaluate this file, then
// JSON.stringify(__pdvExtract()). Read-only: it only adds data-pdv attributes to elements that
// must stay raster, so capture-dom.mjs can screenshot exactly those.
window.__pdvExtract = function ({ vw = innerWidth, vh = innerHeight } = {}) {
  const nodes = [], clips = [], ras = [], masked = [], families = new Set(), features = new Set();
  const css = (el, p) => getComputedStyle(el, p);
  const num = (v) => parseFloat(v) || 0;
  const R = (v) => Math.round(v * 100) / 100;
  const clear = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);
  const onScreen = (r) => r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < vw && r.top < vh;
  const meas = document.createElement('canvas').getContext('2d'), metrics = new Map();
  const fontOf = (s) => `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
  const ascDesc = (font) => {
    if (!metrics.has(font)) { meas.font = font; const m = meas.measureText('Hg'); metrics.set(font, [m.fontBoundingBoxAscent, m.fontBoundingBoxDescent]); }
    return metrics.get(font);
  };
  const radii = (s, r) => ['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((c) => {
    const v = s[`border${c}Radius`].split(' ')[0];
    return R(v.endsWith('%') ? (num(v) / 100) * Math.min(r.width, r.height) : num(v));
  });
  const splitTop = (v) => { const out = []; let d = 0, cur = ''; for (const ch of v) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { out.push(cur); cur = ''; } else cur += ch; } return [...out, cur]; };
  const shadows = (v) => {
    if (!v || v === 'none') return null;
    const list = splitTop(v).map((sv) => {
      const color = (sv.match(/rgba?\([^)]*\)/) || [])[0];
      const rest = sv.replace(color || '', '').trim().split(/\s+/);
      const [x = 0, y = 0, blur = 0, spread = 0] = rest.filter((p) => p !== 'inset').map(num);
      return clear(color) || rest.includes('inset') ? null : { x, y, blur, spread, c: color };
    }).filter(Boolean);
    return list.length ? list : null;
  };
  const transform = (w, s, first) => s.textTransform === 'uppercase' ? w.toUpperCase() : s.textTransform === 'lowercase' ? w.toLowerCase()
    : s.textTransform === 'capitalize' && first ? w[0].toUpperCase() + w.slice(1) : w;
  const mark = (el, hide) => { const id = 'r' + ras.length; el.setAttribute('data-pdv', id); ras.push({ id, hide }); return id; };

  const svgMarkup = (el, s, r) => {
    const clone = el.cloneNode(true);
    const src = [el, ...el.querySelectorAll('*')], dst = [clone, ...clone.querySelectorAll('*')];
    // Page CSS (classes, currentColor) doesn't travel with the markup: inline the painted values.
    src.forEach((a, i) => {
      const cs = css(a);
      for (const p of ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity', 'fill-opacity', 'stroke-opacity', 'fill-rule', 'display'])
        dst[i].style.setProperty(p, cs.getPropertyValue(p));
    });
    clone.style.color = s.color;
    for (const u of clone.querySelectorAll('use')) {
      const ref = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').startsWith('#') && document.querySelector(u.getAttribute('href') || u.getAttribute('xlink:href'));
      if (!ref) continue;
      const g = document.createElementNS('http://www.w3.org/2000/svg', ref.tagName === 'symbol' ? 'svg' : 'g');
      if (ref.getAttribute('viewBox')) g.setAttribute('viewBox', ref.getAttribute('viewBox'));
      for (const a of ['x', 'y', 'width', 'height']) if (u.getAttribute(a)) g.setAttribute(a, u.getAttribute(a));
      for (const ch of ref.childNodes) g.appendChild(ch.cloneNode(true));
      u.replaceWith(g);
    }
    if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${R(r.width)} ${R(r.height)}`);
    clone.setAttribute('width', R(r.width)); clone.setAttribute('height', R(r.height));
    clone.removeAttribute('class');
    return new XMLSerializer().serializeToString(clone);
  };

  const pushText = (words, s, o, clip, font) => {
    if (!words.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const w of words) { x0 = Math.min(x0, w[1]); x1 = Math.max(x1, w[1] + w[3]); y0 = Math.min(y0, w[4]); y1 = Math.max(y1, w[5]); }
    const fill = s.webkitTextFillColor && !clear(s.webkitTextFillColor) ? s.webkitTextFillColor : s.color;
    families.add(s.fontFamily);
    if (s.fontFeatureSettings && s.fontFeatureSettings !== 'normal') features.add(s.fontFeatureSettings);
    nodes.push({ k: 'text', x: R(x0), y: R(y0), w: R(x1 - x0), h: R(y1 - y0), f: font, c: fill,
      ls: s.letterSpacing === 'normal' ? 0 : num(s.letterSpacing), o, clip, words: words.map((w) => [w[0], w[1], w[2]]) });
  };

  const textNode = (n, s, o, clip) => {
    const font = fontOf(s), [asc, desc] = ascDesc(font), range = document.createRange(), words = [];
    let first = true;
    for (const m of n.data.matchAll(/\S+/g)) {
      range.setStart(n, m.index); range.setEnd(n, m.index + m[0].length);
      const b = range.getClientRects()[0];
      const word = transform(m[0], s, first); first = false;
      if (!b || !onScreen(b)) continue;
      words.push([word, R(b.left), R(b.top + (b.height - asc - desc) / 2 + asc), b.width, b.top, b.bottom]);
    }
    pushText(words, s, o, clip, font);
  };

  const fieldText = (el, s, r, o, clip) => {
    const val = el.tagName === 'SELECT' ? el.options[el.selectedIndex]?.text || '' : el.value;
    const shown = val || el.placeholder || '';
    if (!shown.trim()) return;
    const ps = val ? s : css(el, '::placeholder'), font = fontOf(s), [asc, desc] = ascDesc(font);
    const text = (el.type === 'password' && val ? '•'.repeat(val.length) : shown).split('\n')[0];
    const x = r.left + num(s.borderLeftWidth) + num(s.paddingLeft);
    const base = el.tagName === 'TEXTAREA'
      ? r.top + num(s.borderTopWidth) + num(s.paddingTop) + (num(s.lineHeight) || asc + desc) / 2 + (asc - desc) / 2
      : r.top + r.height / 2 + (asc - desc) / 2;
    pushText([[text, R(x), R(base), meas.measureText(text).width, base - asc, base + desc]], { color: ps.color, webkitTextFillColor: '', fontFamily: s.fontFamily, letterSpacing: s.letterSpacing }, o, clip, font);
  };

  const visit = (el, o, clip) => {
    const s = css(el);
    if (s.display === 'none') return;
    const op = o * (s.opacity === '' ? 1 : num(s.opacity));
    if (op < 0.01) return;
    const r = el.getBoundingClientRect(), tag = el.tagName.toLowerCase();
    const vis = s.visibility === 'visible' && onScreen(r);
    const box = { x: R(r.left), y: R(r.top), w: R(r.width), h: R(r.height) };
    if (vis && r.width * r.height > 20000 && ((s.maskImage || s.webkitMaskImage || 'none') !== 'none'))
      masked.push(`${tag}${el.id ? '#' + el.id : ''} at ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (vis) {
      const iconFont = ['::before', '::after'].some((p) => { const ps = css(el, p); return ps.content && !/^(none|normal|""|'')$/.test(ps.content) && /icon|awesome|glyph|symbol/i.test(ps.fontFamily); });
      const isSvgImg = tag === 'img' && /\.svg(\?|#|$)|^data:image\/svg/i.test(el.currentSrc || el.src);
      if (isSvgImg) { nodes.push({ k: 'img', ...box, r: radii(s, r), o: op, clip, src: el.currentSrc || el.src, svg: true }); return; }
      if (tag === 'svg') { nodes.push({ k: 'svg', ...box, o: op, clip, svg: svgMarkup(el, s, r) }); return; }
      if (['img', 'video', 'canvas', 'iframe', 'picture', 'object', 'embed'].includes(tag) || /text/.test(s.webkitBackgroundClip || s.backgroundClip)
        || (iconFont && r.width <= 64 && r.height <= 64) || (tag === 'input' && /^(checkbox|radio|range|color|file)$/.test(el.type))) {
        nodes.push({ k: 'img', ...box, r: radii(s, r), o: op, clip, ras: mark(el, false) });
        return;
      }
      const sides = ['Top', 'Right', 'Bottom', 'Left'].map((d) => [s[`border${d}Style`] === 'none' || s[`border${d}Style`] === 'hidden' ? 0 : num(s[`border${d}Width`]), s[`border${d}Color`]]);
      const bd = sides.some(([w, c]) => w > 0 && !clear(c)) ? sides.map(([w, c]) => [R(w), clear(c) ? null : c]) : null;
      const bg = clear(s.backgroundColor) ? null : s.backgroundColor, sh = shadows(s.boxShadow), bgImg = s.backgroundImage !== 'none';
      if (bg || bd || sh || bgImg) nodes.push({ k: 'box', ...box, r: radii(s, r), o: op, clip, bg, bd, sh, ...(bgImg ? { ras: mark(el, true) } : {}) });
      if (/^(input|textarea|select)$/.test(tag)) fieldText(el, s, r, op, clip);
    }
    let kids = clip;
    if (s.overflowX !== 'visible' || s.overflowY !== 'visible') {
      const p = clip == null ? null : clips[clip];
      let x0 = r.left + num(s.borderLeftWidth), y0 = r.top + num(s.borderTopWidth);
      let x1 = r.right - num(s.borderRightWidth), y1 = r.bottom - num(s.borderBottomWidth);
      if (p) { x0 = Math.max(x0, p[0]); y0 = Math.max(y0, p[1]); x1 = Math.min(x1, p[0] + p[2]); y1 = Math.min(y1, p[1] + p[3]); }
      clips.push([R(x0), R(y0), R(Math.max(0, x1 - x0)), R(Math.max(0, y1 - y0)), radii(s, r)[0]]);
      kids = clips.length - 1;
    }
    for (const ch of el.childNodes) {
      if (ch.nodeType === 1) visit(ch, op, kids);
      else if (ch.nodeType === 3 && s.visibility === 'visible' && ch.data.trim()) textNode(ch, s, op, kids);
    }
  };

  visit(document.body, 1, null);
  const pageBg = [document.documentElement, document.body].map((e) => css(e).backgroundColor).find((c) => !clear(c)) || '#ffffff';
  const sheets = [...document.styleSheets].map((ss) => (ss.href ? { href: ss.href } : { text: (ss.ownerNode && ss.ownerNode.textContent) || '' }));
  return { url: location.href, title: document.title, w: vw, h: vh, bg: pageBg, nodes, clips, ras, masked, features: [...features], families: [...families], sheets };
};
