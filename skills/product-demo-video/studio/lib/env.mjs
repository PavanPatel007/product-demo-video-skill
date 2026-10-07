// Tiny .env loader (no dependency). process.env wins over .env.
import { existsSync, readFileSync } from 'node:fs';

export function loadEnv(file = '.env') {
  const env = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
  return { ...env, ...Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== '')) };
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
