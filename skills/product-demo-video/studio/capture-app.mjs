// node capture-app.mjs [path ...] [--login]
// Read-only tour of a logged-in web app: screenshots every nav page (or the given paths).
// --login opens a visible browser window and the user signs in themselves (SSO, 2FA and passkeys
// work, no password in .env); only the session is kept, in .auth.json. Without --login it fills
// APP_EMAIL / APP_PASSWORD from .env. Needs APP_URL. Never clicks anything except the login submit.
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadEnv, flag, positional } from './lib/env.mjs';
import { launch, session } from './lib/browser.mjs';

const env = loadEnv();
if (!env.APP_URL) { console.error('set APP_URL in ~/.config/product-demo-video/.env or the folder .env'); process.exit(1); }
const BASE = env.APP_URL.replace(/\/$/, '');
mkdirSync('assets/app', { recursive: true });

if (flag('login')) {
  const b = await launch({ headless: false });
  const c = await b.newContext({ viewport: null });
  const p = await c.newPage();
  await p.goto(BASE, { timeout: 60000 }).catch(() => {});
  console.log(`Sign in to ${BASE} in the browser window that just opened (waiting up to 10 minutes).`);
  // Signed in = on the app's origin, not a login URL, no password field, for 3 s in a row.
  const origin = new URL(BASE).origin, end = Date.now() + 600000;
  let calm = 0;
  while (calm < 3 && Date.now() < end && !p.isClosed()) {
    await p.waitForTimeout(1000).catch(() => {});
    try {
      const u = new URL(p.url()), pwd = await p.locator('input[type=password]').count();
      calm = u.origin === origin && !pwd && !/log-?in|sign-?in|auth|sso|oauth/i.test(u.pathname) ? calm + 1 : 0;
    } catch { calm = 0; }
  }
  if (calm < 3) { await b.close().catch(() => {}); console.error('no sign-in detected; run again with --login'); process.exit(1); }
  await c.storageState({ path: '.auth.json' });
  await b.close();
  console.log('signed in; session saved to .auth.json (deleted by workspace.mjs clean)');
}

const browser = await launch();
const ctx = await session(browser, { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const settle = async () => { await page.waitForLoadState('load').catch(() => {}); await page.waitForTimeout(3500); };
const slug = (u) => { const x = new URL(u); return (x.pathname + x.search).replace(/^\/|\/$/g, '').replace(/[^a-z0-9]+/gi, '_') || 'home'; };

await page.goto(BASE, { timeout: 60000 }); await settle();
const pwd = page.locator('input[type=password]');
if (await pwd.count()) {
  if (!env.APP_EMAIL || !env.APP_PASSWORD) { console.error('login page found: run node capture-app.mjs --login and sign in yourself'); process.exit(1); }
  await page.screenshot({ path: 'assets/app/login.png' });
  await page.locator('input[type=email], input[name*=email i], input[name*=user i], input[autocomplete=username]').first().fill(env.APP_EMAIL);
  await pwd.first().fill(env.APP_PASSWORD);
  await Promise.all([page.waitForURL((u) => !/login|sign-?in/i.test(u.pathname), { timeout: 30000 }).catch(() => {}), pwd.first().press('Enter')]);
  await settle();
  await ctx.storageState({ path: '.auth.json' });
}
console.log('landed on', page.url());

const targets = positional(['login']).map((p) => BASE + p);
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
