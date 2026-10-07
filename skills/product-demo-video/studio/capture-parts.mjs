// node capture-parts.mjs /dashboard /content ... [--base https://app.example.com]
// Read-only. Screenshots every card-like element per page into assets/parts/ and writes
// assets/parts/index.json with each part's CSS box and text. Uses a tall viewport because
// many apps scroll inside an inner pane, where fullPage screenshots capture nothing extra.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { loadEnv, arg, positional } from './lib/env.mjs';

const env = loadEnv();
const BASE = (arg('base') || env.APP_URL || '').replace(/\/$/, '');
const PAGES = positional();
if (!BASE || !PAGES.length) { console.error('usage: node capture-parts.mjs /path [/path ...] [--base URL]'); process.exit(1); }
const VW = 1920, VH = Number(arg('h', 3200));
mkdirSync('assets/parts', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2,
  storageState: existsSync('.auth.json') ? '.auth.json' : undefined });
const page = await ctx.newPage();
const index = [];

for (const p of PAGES) {
  await page.goto(BASE + p, { timeout: 60000 }); await page.waitForTimeout(3500);
  const name = p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_') || 'home';
  await page.screenshot({ path: `assets/parts/${name}__page.png` });
  const boxes = await page.evaluate(([VW, VH]) => {
    const out = [];
    document.querySelectorAll('*').forEach((el) => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      const card = parseFloat(s.borderTopLeftRadius) >= 6 && (parseFloat(s.borderTopWidth) >= 1 || s.boxShadow !== 'none')
        && r.width > 300 && r.height > 40 && r.left >= 0 && r.right <= VW && r.top >= 0 && r.bottom <= VH;
      if (card) out.push({ x: r.left, y: r.top, w: r.width, h: r.height, radius: parseFloat(s.borderTopLeftRadius),
        text: el.innerText.trim().replace(/\s+/g, ' ').slice(0, 90) });
    });
    return out;
  }, [VW, VH]);
  for (const [i, b] of boxes.entries()) {
    const file = `assets/parts/${name}__${String(i).padStart(2, '0')}.png`;
    await page.screenshot({ path: file, clip: { x: b.x, y: b.y, width: b.w, height: b.h } });
    index.push({ file, page: p, ...b });
  }
  console.log(p, boxes.length, 'parts');
}
writeFileSync('assets/parts/index.json', JSON.stringify(index, null, 1));
await browser.close();
