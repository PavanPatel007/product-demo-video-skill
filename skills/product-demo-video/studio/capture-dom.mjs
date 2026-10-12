// node capture-dom.mjs <url | /path> ... [--base URL] [--w 1440 --h 900] [--dpr 2] [--wait 2500] [--name x]
// Read-only. Saves each page as vector drawing data for kit.js domPage(), so the UI stays sharp at
// any zoom and every card, row and icon can move on its own:
//   assets/dom/<name>.json           boxes, borders, shadows, text (word positions), SVG icons
//   assets/dom/<name>/               raster parts (photos, <canvas> charts, background images)
//   assets/dom/fonts/                the page's own font files, loaded by loadDom()
//   assets/dom/<name>.png            the screenshot, for reference
//   assets/dom/<name>.compare.png    screenshot | vector | differences in red, plus a match score
// Logged-in pages reuse the session from capture-app.mjs --login.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv, arg, positional } from './lib/env.mjs';
import { launch, session } from './lib/browser.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const env = loadEnv();
const BASE = (arg('base') || env.APP_URL || '').replace(/\/$/, '');
const TARGETS = positional();
if (!TARGETS.length) { console.error('usage: node capture-dom.mjs <url | /path> ... [--base URL] [--w 1440 --h 900]'); process.exit(1); }
const VW = Number(arg('w', 1440)), VH = Number(arg('h', 900)), DPR = Number(arg('dpr', 2)), WAIT = Number(arg('wait', 2500));
mkdirSync('assets/dom/fonts', { recursive: true });

const browser = await launch({ args: ['--allow-file-access-from-files'] });
const ctx = await session(browser, { viewport: { width: VW, height: VH }, deviceScaleFactor: DPR });
const page = await ctx.newPage();
const extract = readFileSync(join(here, 'lib/dom-extract.js'), 'utf8');
// /dashboard -> dashboard; https://www.acme.com/pricing -> acme.com_pricing
const slug = (t, u) => {
  const x = new URL(u), host = /^https?:/.test(t) ? x.hostname.replace(/^www\./, '') + '/' : '';
  return (host + (x.pathname + x.search).replace(/\.html?$/, '').replace(/^\/|\/$/g, '')).replace(/[^a-z0-9.]+/gi, '_').replace(/_$/, '').slice(-60) || 'home';
};

const fetchBuf = async (u) => {
  if (u.startsWith('file:')) return readFileSync(fileURLToPath(u));
  if (u.startsWith('data:')) { const [, meta, body] = u.match(/^data:([^,]*),(.*)$/s); return /;base64/.test(meta) ? Buffer.from(body, 'base64') : Buffer.from(decodeURIComponent(body)); }
  const r = await ctx.request.get(u, { timeout: 30000 });
  if (!r.ok()) throw new Error(`${r.status()} ${u}`);
  return r.body();
};
// Only faces that cover Latin text: Google-style CSS ships dozens of unicode-range subsets.
const latin = (range) => !range || range.split(',').some((p) => {
  const m = p.trim().match(/^U\+([0-9A-F?]+)(?:-([0-9A-F]+))?$/i);
  if (!m) return false;
  const lo = parseInt(m[1].replace(/\?/g, '0'), 16), hi = m[2] ? parseInt(m[2], 16) : parseInt(m[1].replace(/\?/g, 'F'), 16);
  return lo <= 0x41 && hi >= 0x7a;
});
const unq = (s) => s.trim().replace(/^["']|["']$/g, '');

async function fonts(sheets, pageUrl, families) {
  const used = new Set(families.flatMap((f) => f.split(',').map(unq)));
  const texts = [];
  const add = async (base, text, depth) => {
    texts.push({ base, text });
    if (depth > 1) return;
    for (const m of text.matchAll(/@import\s+(?:url\()?\s*['"]?([^'")\s;]+)/g)) {
      const u = new URL(m[1], base).href;
      try { await add(u, (await fetchBuf(u)).toString('utf8'), depth + 1); } catch {}
    }
  };
  for (const s of sheets) {
    if (s.href) { try { await add(s.href, (await fetchBuf(s.href)).toString('utf8'), 0); } catch {} }
    else await add(pageUrl, s.text, 0);
  }
  const out = [], seen = new Set();
  for (const { base, text } of texts) for (const block of text.match(/@font-face\s*\{[^}]*\}/g) || []) {
    const family = unq(block.match(/font-family\s*:\s*([^;}]+)/i)?.[1] || '');
    const range = block.match(/unicode-range\s*:\s*([^;}]+)/i)?.[1].trim();
    if (!used.has(family) || !latin(range)) continue;
    const srcs = [...block.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)(?:\s*format\(\s*['"]?([^'")]+)['"]?\s*\))?/g)];
    const pick = srcs.find((m) => /woff2/i.test(m[2] || m[1])) || srcs.find((m) => /woff|truetype|opentype|ttf|otf/i.test(m[2] || m[1])) || srcs[0];
    if (!pick) continue;
    const url = new URL(pick[1], base).href;
    const ext = (url.split('?')[0].match(/\.(woff2?|ttf|otf)$/i) || [, 'woff2'])[1].toLowerCase();
    const file = `fonts/${createHash('sha1').update(url).digest('hex').slice(0, 12)}.${ext}`;
    if (seen.has(file + family)) continue;
    seen.add(file + family);
    if (!existsSync(`assets/dom/${file}`)) { try { writeFileSync(`assets/dom/${file}`, await fetchBuf(url)); } catch (e) { console.warn('  font not downloaded:', e.message); continue; } }
    out.push({ family, weight: block.match(/font-weight\s*:\s*([^;}]+)/i)?.[1].trim(), style: block.match(/font-style\s*:\s*([^;}]+)/i)?.[1].trim(), range, src: file });
  }
  return out;
}

const preview = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
preview.on('pageerror', (e) => console.error('  preview error:', e.message));

for (const t of TARGETS) {
  if (!/^(https?|file):/.test(t) && !BASE) { console.error(`${t}: set APP_URL or pass --base`); process.exit(1); }
  const url = /^(https?|file):/.test(t) ? t : BASE + t;
  const name = TARGETS.length === 1 && arg('name') ? arg('name') : slug(t, url);
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(WAIT);
  await page.evaluate(() => document.fonts.ready);
  // Entrance animations would otherwise move between the screenshot and the extraction: jump them
  // to their end state; endless ones (marquees, spinners) stop where they are.
  await page.evaluate(() => document.getAnimations().forEach((a) => { try { a.finish(); } catch { a.pause(); } }));
  await page.waitForTimeout(300);
  if (await page.locator('input[type=password]').count()) console.warn(`${name}: this page shows a login form; run node capture-app.mjs --login first`);
  await page.screenshot({ path: `assets/dom/${name}.png`, scale: 'css' });
  const data = await page.evaluate(`${extract}\n;__pdvExtract(${JSON.stringify({ vw: VW, vh: VH })})`);

  const dir = `assets/dom/${name}`;
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  await page.addStyleTag({ content: '[data-pdv-hide] * { visibility: hidden !important } [data-pdv-hide] { color: transparent !important }' });
  const hide = new Map(data.ras.map((r) => [r.id, r.hide]));
  let raster = 0, files = 0;
  for (const [i, n] of data.nodes.entries()) {
    if (n.ras) {
      const sel = `[data-pdv="${n.ras}"]`, x0 = Math.max(0, n.x), y0 = Math.max(0, n.y), x1 = Math.min(VW, n.x + n.w), y1 = Math.min(VH, n.y + n.h);
      if (hide.get(n.ras)) await page.evaluate((s) => document.querySelector(s)?.setAttribute('data-pdv-hide', ''), sel);
      if (x1 - x0 >= 1 && y1 - y0 >= 1) {
        await page.screenshot({ path: `${dir}/${n.ras}.png`, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
        Object.assign(n, { x: x0, y: y0, w: x1 - x0, h: y1 - y0, file: `${name}/${n.ras}.png` });
        raster++;
      }
      if (hide.get(n.ras)) await page.evaluate((s) => document.querySelector(s)?.removeAttribute('data-pdv-hide'), sel);
      delete n.ras;
    } else if (n.k === 'img' && n.svg === true) {
      try {
        let svg = (await fetchBuf(n.src)).toString('utf8');
        // declared 4x so canvas rasterizes it sharp at camera zooms
        svg = svg.replace(/<svg\b[^>]*>/, (tag) => {
          let t2 = tag.replace(/\s(width|height)="[^"]*"/g, '');
          if (!/viewBox=/.test(t2)) t2 = t2.replace('<svg', `<svg viewBox="0 0 ${n.w} ${n.h}"`);
          return t2.replace('<svg', `<svg width="${n.w * 4}" height="${n.h * 4}"`);
        });
        writeFileSync(`${dir}/i${i}.svg`, svg);
        n.file = `${name}/i${i}.svg`; files++;
      } catch (e) { console.warn('  svg not fetched:', e.message); }
      delete n.src; delete n.svg;
    }
  }
  await page.evaluate(() => document.querySelectorAll('[data-pdv]').forEach((e) => e.removeAttribute('data-pdv')));

  const out = { url: data.url, title: data.title, w: data.w, h: data.h, bg: data.bg,
    fonts: await fonts(data.sheets, data.url, data.families), clips: data.clips, nodes: data.nodes };
  writeFileSync(`${dir}.json`, JSON.stringify(out));

  const abs = (f) => pathToFileURL(resolve(f)).href;
  await preview.goto(`${pathToFileURL(join(here, 'lib/dom-preview.html')).href}?dom=${encodeURIComponent(abs(`${dir}.json`))}&ref=${encodeURIComponent(abs(`${dir}.png`))}`);
  const { match } = await preview.evaluate(() => window.result);
  await preview.locator('#c').screenshot({ path: `${dir}.compare.png` });
  const count = (k) => out.nodes.filter((n) => n.k === k).length;
  console.log(`${name}: ${out.nodes.length} nodes (${count('text')} text, ${count('box')} boxes, ${count('svg') + files} svg, ${raster} raster), ${out.fonts.length} font files, vector match ${(match * 100).toFixed(0)}% -> ${dir}.compare.png`);
  if (data.features.length) console.log(`  font features canvas can't apply (a few alternate letter shapes differ): ${data.features.join('; ')}`);
  if (data.masked.length) console.log(`  drawn without their CSS mask (fades): ${data.masked.join(', ')}`);
  if (match < 0.9) console.log(`  under 90%: open ${dir}.compare.png; red marks what the vector copy misses. Use the screenshot (shot()) for those parts.`);
}
await browser.close();
