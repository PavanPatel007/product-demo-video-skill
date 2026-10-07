// node capture-site.mjs https://example.com [--w 1920 --h 1080]
// -> assets/site/hero.png, full.png, section_NN.png, brand.json (computed colors, fonts, logo candidates)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { arg, positional } from './lib/env.mjs';

const [URL] = positional();
if (!URL) { console.error('usage: node capture-site.mjs <url> [--w 1920 --h 1080]'); process.exit(1); }
const W = Number(arg('w', 1920)), H = Number(arg('h', 1080));
mkdirSync('assets/site', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
// 'networkidle' hangs on sites with live trackers/chat widgets
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(4000);

await page.screenshot({ path: 'assets/site/hero.png' });
await page.screenshot({ path: 'assets/site/full.png', fullPage: true });

const brand = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel); if (!el) return null; const s = getComputedStyle(el);
    return { sel, color: s.color, bg: s.backgroundColor, font: s.fontFamily, weight: s.fontWeight, size: s.fontSize, tracking: s.letterSpacing, text: el.textContent.trim().slice(0, 120) };
  };
  const colors = {};
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    for (const v of [s.color, s.backgroundColor, s.borderTopColor]) if (v && v !== 'rgba(0, 0, 0, 0)') colors[v] = (colors[v] || 0) + 1;
  }
  const logo = [...document.querySelectorAll('header img, header svg, nav img, nav svg, a[href="/"] img, a[href="/"] svg, img[alt*=logo i], img[src*=logo i]')]
    .map((e) => ({ tag: e.tagName, src: e.getAttribute('src') && new URL(e.getAttribute('src'), location.href).href, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height }));
  const fonts = [...new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`))];
  const fontFiles = [...document.styleSheets].flatMap((ss) => { try { return [...ss.cssRules]; } catch { return []; } })
    .filter((r) => r.constructor.name === 'CSSFontFaceRule')
    .map((r) => ({ family: r.style.getPropertyValue('font-family'), weight: r.style.getPropertyValue('font-weight'), src: r.style.getPropertyValue('src').slice(0, 200) }));
  const sections = [...document.querySelectorAll('h1, h2')].slice(0, 40)
    .map((e) => ({ tag: e.tagName, y: Math.round(e.getBoundingClientRect().top + scrollY), text: e.textContent.trim().slice(0, 80) }));
  return { title: document.title, h1: pick('h1'), h2: pick('h2'), p: pick('p'), body: pick('body'),
    button: pick('a[class*=button], button, a[class*=btn]'),
    colors: Object.entries(colors).sort((a, b) => b[1] - a[1]).slice(0, 25), logo, fonts, fontFiles, sections };
});
writeFileSync('assets/site/brand.json', JSON.stringify(brand, null, 1));

for (const [i, s] of brand.sections.filter((s) => s.tag === 'H2').entries()) {
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 120)), s.y);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `assets/site/section_${String(i).padStart(2, '0')}.png` });
}
await browser.close();
console.log(`captured ${URL}: hero, full page, ${brand.sections.length} headings -> assets/site/ (see brand.json)`);
