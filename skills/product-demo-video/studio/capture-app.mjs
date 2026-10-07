// node capture-app.mjs [path ...]
// Read-only tour of a logged-in web app: logs in once, screenshots every nav page (or the given paths).
// Needs .env: APP_URL, APP_EMAIL, APP_PASSWORD. Session is cached in .auth.json (gitignored).
// Never clicks anything except the login submit.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { loadEnv, positional } from './lib/env.mjs';

const env = loadEnv();
if (!env.APP_URL) { console.error('set APP_URL (and APP_EMAIL / APP_PASSWORD if it needs a login) in .env'); process.exit(1); }
const BASE = env.APP_URL.replace(/\/$/, '');
mkdirSync('assets/app', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2,
  storageState: existsSync('.auth.json') ? '.auth.json' : undefined,
});
const page = await ctx.newPage();
const settle = async () => { await page.waitForLoadState('load').catch(() => {}); await page.waitForTimeout(3500); };
const slug = (u) => { const x = new URL(u); return (x.pathname + x.search).replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '_') || 'home'; };

await page.goto(BASE, { timeout: 60000 }); await settle();
const pwd = page.locator('input[type=password]');
if (await pwd.count()) {
  if (!env.APP_EMAIL || !env.APP_PASSWORD) { console.error('login page found: set APP_EMAIL and APP_PASSWORD in .env'); process.exit(1); }
  await page.screenshot({ path: 'assets/app/login.png' });
  await page.locator('input[type=email], input[name*=email i], input[name*=user i], input[autocomplete=username]').first().fill(env.APP_EMAIL);
  await pwd.first().fill(env.APP_PASSWORD);
  await Promise.all([page.waitForURL((u) => !/login|sign-?in/i.test(u.pathname), { timeout: 30000 }).catch(() => {}), pwd.first().press('Enter')]);
  await settle();
  await ctx.storageState({ path: '.auth.json' });
}
console.log('landed on', page.url());

const targets = positional().map((p) => BASE + p);
if (!targets.length) {
  const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')]
    .map((a) => ({ href: a.href, text: a.textContent.trim().replace(/\s+/g, ' ').slice(0, 60) }))
    .filter((l) => l.href.startsWith(location.origin)));
  writeFileSync('assets/app/links.json', JSON.stringify(links, null, 1));
  targets.push(page.url(), ...new Set(links.map((l) => l.href.split('#')[0])));
}

const seen = new Set(), pages = [];
for (const url of targets) {
  if (seen.has(url) || /logout|sign-?out|delete|remove/i.test(url)) continue;
  seen.add(url);
  await page.goto(url, { timeout: 60000 }).catch(() => {}); await settle();
  const name = slug(page.url());
  await page.screenshot({ path: `assets/app/${name}.png` });
  const text = await page.evaluate(() => document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 2500));
  pages.push({ url: page.url(), name, text });
  console.log('captured', name);
}
writeFileSync('assets/app/pages.json', JSON.stringify(pages, null, 1));
await browser.close();
