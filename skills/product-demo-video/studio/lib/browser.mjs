// One way to start a browser for every script. Headless runs prefer Playwright's headless shell when
// it is already on the machine: it is a bare binary, not Google Chrome.app, so it never shows a window,
// a Dock icon or a "quit unexpectedly" dialog. Otherwise the installed Chrome, then Edge, so most
// people never download Playwright's 100 MB Chromium. The login window (headed) uses Chrome first.
// PDV_BROWSER=chromium forces the bundled one, PDV_BROWSER=chrome|msedge picks a channel.
//   node lib/browser.mjs --check     prints the browser that launches, exit 1 if none
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Agent sandboxes (Cursor) point PLAYWRIGHT_BROWSERS_PATH at an empty temp cache, even for commands
// run with full permissions. Must be fixed before Playwright is imported: it reads the path once.
const defaultCache = process.platform === 'darwin' ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
  : process.platform === 'win32' ? join(process.env.LOCALAPPDATA || homedir(), 'ms-playwright')
  : join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'ms-playwright');
const hasShell = (dir) => { try { return readdirSync(dir).some((d) => d.startsWith('chromium_headless_shell-')); } catch { return false; } };
if (process.env.PLAYWRIGHT_BROWSERS_PATH && !hasShell(process.env.PLAYWRIGHT_BROWSERS_PATH) && hasShell(defaultCache)) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = defaultCache;
}

let pw;
try { pw = await import('playwright'); } catch {}

// Inside an agent's sandbox Chrome and Edge abort on start, and macOS shows a crash dialog for each.
const sandboxed = !!(process.env.CURSOR_SANDBOX || process.env.CODEX_SANDBOX);
const SANDBOX_HELP = 'the browser cannot start inside the agent sandbox: rerun this command with full permissions (outside the sandbox)';

const order = (headless) => {
  const want = (process.env.PDV_BROWSER || '').toLowerCase();
  if (want === 'chromium') return [undefined];
  if (want) return [want];
  const installed = sandboxed ? [] : ['chrome', 'msedge'];
  return headless ? [undefined, ...installed] : [...installed, undefined];
};

export async function launch(opts = {}) {
  if (!pw) throw new Error('Playwright is not installed: run node workspace.mjs init <name> (or npm i playwright)');
  const headless = opts.headless !== false;
  if (sandboxed && !headless) throw new Error(SANDBOX_HELP);
  let last;
  for (const channel of order(headless)) {
    try {
      const browser = await pw.chromium.launch({ ...opts, ...(channel ? { channel } : {}) });
      browser.label = `${channel === 'msedge' ? 'Microsoft Edge' : channel === 'chrome' ? 'Google Chrome' : headless ? 'Chromium headless shell' : 'bundled Chromium'} ${browser.version()}`;
      return browser;
    } catch (e) { last = e; }
  }
  if (sandboxed) throw new Error(SANDBOX_HELP + '\n' + last.message.split('\n')[0]);
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
