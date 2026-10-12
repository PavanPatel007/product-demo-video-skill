// node cost-report.mjs --video out/final.mp4 [source flags]
//
// Token sources, tried in this order unless --source is given:
//   claude    Claude Code session logs for this folder or the user's folder the workspace delivers
//             to (~/.claude/projects/<folder-slug>/*.jsonl)
//   codex     Codex CLI session logs whose cwd is one of those folders (~/.codex/sessions/**.jsonl)
//   manual    --model claude-opus-5-5 --input N --output N [--cache-read N --cache-write N --cache-write-1h N]
//             (copy these from your usage dashboard: Cursor, Anthropic Console, OpenRouter, ...)
//   estimate  --transcript chat.jsonl   visible conversation text / 4. LOWER BOUND: excludes tool
//             output, images and re-sent context; label it as an estimate when reporting.
// Other flags: --seconds N (instead of --video), --all-sessions (sum every session of this project),
//   --claude-dir / --codex-dir (override log locations), --pricing pricing.json
// Adds voiceover cost from audio/vo_usage.json. Writes out/cost_report.md and prints it.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { arg, flag, workspace } from './lib/env.mjs';

const here = new URL('.', import.meta.url).pathname;
const pricing = JSON.parse(readFileSync(arg('pricing', existsSync('pricing.json') ? 'pricing.json' : join(here, 'pricing.json')), 'utf8'));
const cwd = process.cwd();
// The agent's session runs in the user's folder, not in the workspace, so its logs are filed there.
const folders = [...new Set([workspace()?.root, cwd, process.env.PWD].filter(Boolean))];

const seconds = arg('seconds') ? Number(arg('seconds')) : arg('video')
  ? Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arg('video')], { encoding: 'utf8' }))
  : null;

const blank = () => ({ input: 0, output: 0, cache_read: 0, cache_write_5m: 0, cache_write_1h: 0, requests: 0 });
const jsonl = (f) => readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
const walk = (dir) => !existsSync(dir) ? [] : readdirSync(dir, { withFileTypes: true })
  .flatMap((d) => d.isDirectory() ? walk(join(dir, d.name)) : d.name.endsWith('.jsonl') ? [join(dir, d.name)] : []);
const pickFiles = (files) => {
  const sorted = files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return flag('all-sessions') ? sorted : sorted.slice(0, 1);
};

function fromClaude() {
  const slugs = folders.map((p) => join(homedir(), '.claude', 'projects', p.replace(/[^a-zA-Z0-9]/g, '-')));
  const root = arg('claude-dir', slugs.find(existsSync) || slugs[0]);
  const files = pickFiles(walk(root));
  if (!files.length) return null;
  const byModel = {}, seen = new Set();
  for (const f of files) for (const e of jsonl(f)) {
    const m = e.message;
    if (!m?.usage || !m.model || m.model === '<synthetic>') continue;
    const id = m.id || e.requestId || e.uuid;
    if (seen.has(id)) continue;
    seen.add(id);
    const u = m.usage, b = (byModel[m.model] ||= blank());
    const w1h = u.cache_creation?.ephemeral_1h_input_tokens || 0;
    b.input += u.input_tokens || 0;
    b.output += u.output_tokens || 0;
    b.cache_read += u.cache_read_input_tokens || 0;
    b.cache_write_1h += w1h;
    b.cache_write_5m += (u.cache_creation_input_tokens || 0) - w1h;
    b.requests++;
  }
  return { source: `Claude Code logs (${files.length} session${files.length > 1 ? 's' : ''})`, exact: true, byModel };
}

function fromCodex() {
  const real = (p) => { try { return realpathSync(p); } catch { return p; } };
  const mine = new Set(folders.map(real));
  const files = walk(arg('codex-dir', join(homedir(), '.codex', 'sessions'))).filter((f) => {
    const meta = readFileSync(f, 'utf8').split('\n', 5).map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .find((e) => e?.payload?.cwd);
    return meta && mine.has(real(meta.payload.cwd));
  });
  const chosen = pickFiles(files);
  if (!chosen.length) return null;
  const byModel = {};
  for (const f of chosen) {
    let model = 'unknown', last = null, turns = 0;
    for (const e of jsonl(f)) {
      const p = e.payload || {};
      if (p.model) model = p.model;
      if (p.type === 'token_count' && p.info?.total_token_usage) { last = p.info.total_token_usage; turns++; }
    }
    if (!last) continue;
    const b = (byModel[model] ||= blank());
    b.input += (last.input_tokens || 0) - (last.cached_input_tokens || 0);
    b.cache_read += last.cached_input_tokens || 0;
    b.output += (last.output_tokens || 0) + (last.reasoning_output_tokens || 0);
    b.requests += turns;
  }
  return Object.keys(byModel).length ? { source: `Codex logs (${chosen.length} session${chosen.length > 1 ? 's' : ''})`, exact: true, byModel } : null;
}

function fromManual() {
  if (!arg('input') && !arg('output')) return null;
  const b = blank();
  b.input = Number(arg('input', 0)); b.output = Number(arg('output', 0));
  b.cache_read = Number(arg('cache-read', 0)); b.cache_write_5m = Number(arg('cache-write', 0)); b.cache_write_1h = Number(arg('cache-write-1h', 0));
  return { source: 'numbers from your usage dashboard', exact: true, byModel: { [arg('model', 'claude-opus-5-5')]: b } };
}

function fromEstimate() {
  const f = arg('transcript'); if (!f || !existsSync(f)) return null;
  let user = 0, asst = 0, turns = 0;
  for (const e of jsonl(f)) {
    const text = JSON.stringify(e.message?.content ?? e.content ?? '');
    if (e.role === 'user' || e.type === 'user') { user += text.length; turns++; } else asst += text.length;
  }
  const b = blank();
  b.input = Math.round(user / 4); b.output = Math.round(asst / 4); b.requests = turns;
  return { source: 'visible-text estimate (lower bound)', exact: false, byModel: { [arg('model', 'claude-opus-5-5')]: b } };
}

const sources = { claude: fromClaude, codex: fromCodex, manual: fromManual, estimate: fromEstimate };
let usage = null;
for (const name of arg('source') ? [arg('source')] : ['manual', 'claude', 'codex', 'estimate']) {
  usage = sources[name]?.(); if (usage) break;
}

const norm = (id) => id.toLowerCase().replace(/\./g, '-').replace(/^(anthropic|openrouter)\//, '');
const priceFor = (model) => {
  const n = norm(model);
  const key = Object.keys(pricing.models).sort((a, b) => b.length - a.length).find((k) => n.startsWith(k) || n.includes(k));
  return key ? pricing.models[key] : null;
};
const fmt = (n) => n.toLocaleString('en-US');
const usd = (n) => '$' + n.toFixed(n < 1 ? 3 : 2);

const rows = [];
let tokensTotal = 0, modelCost = 0, unpriced = [];
if (usage) for (const [model, b] of Object.entries(usage.byModel)) {
  const p = priceFor(model);
  const tokens = b.input + b.output + b.cache_read + b.cache_write_5m + b.cache_write_1h;
  tokensTotal += tokens;
  const cost = p ? (b.input * p.input + b.output * p.output + b.cache_read * p.cache_read
    + b.cache_write_5m * p.cache_write_5m + b.cache_write_1h * p.cache_write_1h) / 1e6 : null;
  if (cost === null) unpriced.push(model); else modelCost += cost;
  rows.push(`| ${model} | ${fmt(b.input)} | ${fmt(b.output)} | ${fmt(b.cache_read)} | ${fmt(b.cache_write_5m + b.cache_write_1h)} | ${fmt(tokens)} | ${cost === null ? 'add to pricing.json' : usd(cost)} |`);
}

let voiceCost = 0, voiceLine = '';
if (existsSync('audio/vo_usage.json')) {
  const v = JSON.parse(readFileSync('audio/vo_usage.json', 'utf8'));
  const rate = pricing.voice_per_1k_chars[v.provider] ?? 0;
  voiceCost = v.characters / 1000 * rate;
  voiceLine = `| Voiceover (${v.provider}) | ${fmt(v.characters)} characters | ${usd(voiceCost)} (approx. list rate) |`;
}

const total = modelCost + voiceCost;
const out = [
  `# Cost report${seconds ? `: ${Math.round(seconds)}-second video` : ''}`,
  '',
  usage ? `Token source: **${usage.source}**${usage.exact ? '' : ' — lower bound, real usage is higher'}` : 'Token source: **none found**. Re-run with numbers from your usage dashboard: `--input N --output N --cache-read N --cache-write N`.',
  '',
  '| Model | Input | Output | Cache read | Cache write | Total tokens | Cost |',
  '|---|---|---|---|---|---|---|',
  ...rows,
  '',
  ...(voiceLine ? ['| Extra | Usage | Cost |', '|---|---|---|', voiceLine, ''] : []),
  `**Total: ${fmt(tokensTotal)} tokens, about ${usd(total)}**${seconds ? ` (${usd(total / seconds)} per second of video)` : ''}`,
  unpriced.length ? `\nNo price for: ${unpriced.join(', ')}. Add it to pricing.json.` : '',
  '\nPrices: pricing.json (model rates from the provider pricing page; voice rates approximate). Subscription plans (Claude Max, Cursor Pro) bill differently; this is the pay-as-you-go API equivalent.',
].join('\n');

mkdirSync('out', { recursive: true });
writeFileSync('out/cost_report.md', out + '\n');
console.log(out);
