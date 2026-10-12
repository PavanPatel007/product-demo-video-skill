// Tiny .env loader (no dependency). Later sources win: ~/.config/product-demo-video/.env (keys for
// every video), the user's folder's .env, the workspace's .env, then process.env.
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

// The workspace record written by workspace.mjs: { name, root } (root = the user's folder).
export function workspace() {
  try { return JSON.parse(readFileSync('.pdv.json', 'utf8')); } catch { return null; }
}

function parse(file) {
  const env = {};
  if (file && existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return env;
}

export function loadEnv(file = '.env') {
  const root = workspace()?.root;
  const files = [join(homedir(), '.config', 'product-demo-video', '.env'), root && join(root, '.env'), file];
  return Object.assign({}, ...files.map(parse), Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== '')));
}

export const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 && process.argv[i + 1] !== undefined && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
export const flag = (k) => process.argv.includes('--' + k);
export const positional = () => {
  const out = [];
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) { if (process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) i++; continue; }
    out.push(process.argv[i]);
  }
  return out;
};
