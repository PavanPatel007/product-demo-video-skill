// node probe-targets.mjs targets.json [--base URL]
// targets.json: { "/dashboard": ["Not named", "Article drafts"], "/content": ["searches/mo"] }
// Read-only. Writes assets/targets.json with the CSS box of every text node containing a needle,
// so rings and cursor targets in the animation land exactly on real UI.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { loadEnv, arg, positional } from './lib/env.mjs';

const env = loadEnv();
const BASE = (arg('base') || env.APP_URL || '').replace(/\/$/, '');
const [file] = positional();
if (!BASE || !file) { console.error('usage: node probe-targets.mjs targets.json [--base URL]'); process.exit(1); }
const JOBS = JSON.parse(readFileSync(file, 'utf8'));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: Number(arg('h', 3200)) },
  storageState: existsSync('.auth.json') ? '.auth.json' : undefined });
const page = await ctx.newPage();
const out = {};
for (const [p, needles] of Object.entries(JOBS)) {
  await page.goto(BASE + p, { timeout: 60000 }); await page.waitForTimeout(3500);
  out[p] = await page.evaluate((needles) => {
    const res = {};
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode, txt = n.textContent;
      for (const k of needles) if (txt.includes(k)) {
        const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
        if (b.width && b.right <= innerWidth) (res[k] ||= []).push({ text: txt.trim().slice(0, 60), x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) });
      }
    }
    return res;
  }, needles);
}
writeFileSync('assets/targets.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
