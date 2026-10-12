// One way to start a browser for every script. Prefers a browser already on the machine (Chrome,
// then Edge), so most people never download Playwright's 100 MB Chromium; PDV_BROWSER=chromium
// forces the bundled one, PDV_BROWSER=chrome|msedge picks a channel.
//   node lib/browser.mjs --check     prints the browser that launches, exit 1 if none
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let pw;
try { pw = await import('playwright'); } catch {}

const order = () => {
  const want = (process.env.PDV_BROWSER || '').toLowerCase();
  if (want === 'chromium') return [undefined];
  if (want) return [want];
  return ['chrome', 'msedge', undefined];
};

export async function launch(opts = {}) {
  if (!pw) throw new Error('Playwright is not installed: run node workspace.mjs init <name> (or npm i playwright)');
  let last;
  for (const channel of order()) {
    try {
      const browser = await pw.chromium.launch({ ...opts, ...(channel ? { channel } : {}) });
      browser.label = `${channel === 'msedge' ? 'Microsoft Edge' : channel === 'chrome' ? 'Google Chrome' : 'bundled Chromium'} ${browser.version()}`;
      return browser;
    } catch (e) { last = e; }
  }
  throw new Error('no browser launches: install Google Chrome, or run npx playwright install chromium\n' + last.message.split('\n')[0]);
}

// A context that reuses the logged-in session from capture-app.mjs --login, when there is one.
export async function session(browser, opts = {}) {
  return browser.newContext({ ...opts, storageState: existsSync('.auth.json') ? '.auth.json' : undefined });
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--check')) {
  try { const b = await launch(); console.log(b.label); await b.close(); }
  catch (e) { console.error(e.message); process.exit(1); }
}
