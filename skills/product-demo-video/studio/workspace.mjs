#!/usr/bin/env node
// Where a video gets made. The user's folder (ROOT) only ever receives the final MP4s. Everything
// else (the film's code, captures, audio, drafts) lives in a workspace under PDV_HOME, default
// ~/.cache/product-demo-video/projects/<name>, so follow-up edits stay a one-line change.
//
//   node workspace.mjs init <name> [--root DIR] [--no-install]   create or reuse; prints WORK and ROOT
//   node workspace.mjs clean <name> [--all]    drop drafts and references (--all: the whole workspace)
//   node workspace.mjs list                    workspaces, their sizes and where their videos went
//
// Playwright is installed once in PDV_HOME; every workspace finds it (Node looks in parent folders).
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arg, flag, positional } from './lib/env.mjs';

const studio = dirname(fileURLToPath(import.meta.url));
const HOME = resolve(process.env.PDV_HOME || join(process.env.XDG_CACHE_HOME || join(homedir(), '.cache'), 'product-demo-video'));
const PROJECTS = join(HOME, 'projects');
const [cmd, rawName] = positional();
const name = (rawName || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const work = join(PROJECTS, name);
const meta = (dir) => { try { return JSON.parse(readFileSync(join(dir, '.pdv.json'), 'utf8')); } catch { return {}; } };
const size = (p) => { const s = statSync(p); return s.isDirectory() ? readdirSync(p).reduce((n, f) => n + size(join(p, f)), 0) : s.size; };
const mb = (b) => `${(b / 1e6).toFixed(1)} MB`;
const need = () => { if (!name) { console.error(`usage: node workspace.mjs ${cmd || 'init'} <product-name>`); process.exit(1); } };
const sh = (bin, args, opts) => execFileSync(process.platform === 'win32' ? bin + '.cmd' : bin, args, { stdio: 'inherit', ...opts });

if (cmd === 'init') {
  need();
  const root = resolve(arg('root', process.cwd()));
  if (root === HOME || root.startsWith(HOME + sep)) { console.error(`--root must be the user's folder, not inside ${HOME}`); process.exit(1); }
  const fresh = !existsSync(join(work, 'index.html'));
  if (fresh) {
    cpSync(studio, work, { recursive: true, filter: (src) => !/node_modules|\.DS_Store/.test(src) });
    for (const d of ['assets/screens', 'audio', 'docs', 'refs', 'out']) mkdirSync(join(work, d), { recursive: true });
    for (const f of ['mix.sh', 'check.sh']) chmodSync(join(work, f), 0o755);
  }
  const now = new Date().toISOString();
  writeFileSync(join(work, '.pdv.json'), JSON.stringify({ name, root, created: meta(work).created || now, updated: now }, null, 1));
  if (!flag('no-install') && !existsSync(join(HOME, 'node_modules', 'playwright', 'package.json'))) {
    console.log(`installing Playwright once for every video → ${HOME}/node_modules`);
    sh('npm', ['i', '--prefix', HOME, '--no-audit', '--no-fund', '--silent', 'playwright@^1.48']);
    sh('npx', ['playwright', 'install', 'chromium'], { cwd: HOME });
  }
  console.log(`WORK=${work}   ${fresh ? 'new workspace' : 'existing workspace (follow-up edit)'}`);
  console.log(`ROOT=${root}   final MP4s go here, nothing else`);
} else if (cmd === 'clean') {
  need();
  if (!existsSync(work)) { console.error(`no workspace ${work}`); process.exit(1); }
  const before = size(work);
  if (flag('all')) rmSync(work, { recursive: true, force: true });
  else {
    // Keep the film's source and the review images (out/check); drop renders, drafts and references.
    for (const f of readdirSync(join(work, 'out'))) if (f !== 'check') rmSync(join(work, 'out', f), { recursive: true, force: true });
    for (const d of ['refs', 'audio/vo']) rmSync(join(work, d), { recursive: true, force: true });
  }
  console.log(`freed ${mb(before - (existsSync(work) ? size(work) : 0))}${flag('all') ? `, removed ${work}` : `; source kept in ${work} (${mb(size(work))})`}`);
} else if (cmd === 'list') {
  const all = existsSync(PROJECTS) ? readdirSync(PROJECTS).filter((d) => existsSync(join(PROJECTS, d, '.pdv.json'))) : [];
  if (!all.length) console.log(`no workspaces in ${PROJECTS}`);
  for (const d of all) {
    const m = meta(join(PROJECTS, d));
    console.log(`${d.padEnd(28)} ${mb(size(join(PROJECTS, d))).padStart(10)}   videos → ${m.root}   updated ${(m.updated || '').slice(0, 10)}`);
  }
} else {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 10).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(cmd ? 1 : 0);
}
