// node gallery.mjs [words...] [--tag "Product UI"] [--limit 12]
// Searches prompt-motion.com (Opus 5.5 motion films with their prompts) by title words and, with
// --tag, by the entry's tags (Product UI, Phone, Kinetic type, Charts, Music, ...). Prints each
// match's link; pass one to `node ref.mjs <link>` to analyze its video and read its prompt.
import { listGallery, readEntry } from './lib/gallery.mjs';
import { arg } from './lib/env.mjs';

const words = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(all[i - 1] || '').startsWith('--')).map((w) => w.toLowerCase());
const tag = arg('tag'), limit = Number(arg('limit', 12));
let rows = (await listGallery()).filter((r) => words.every((w) => r.title.toLowerCase().includes(w)));
if (tag) {
  const out = [];
  for (const r of rows) {
    if (out.length >= limit) break;
    const e = await readEntry(r.url);
    if (e.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) out.push({ ...r, tags: e.tags, plen: e.prompt.length });
  }
  rows = out;
}
rows = rows.slice(0, limit);
if (!rows.length) { console.log('no match. Try fewer words, or --tag "Product UI" / Phone / "Kinetic type" / Charts / Music.'); process.exit(0); }
for (const r of rows) {
  console.log(`#${String(r.rank + 1).padStart(3)}  ${r.title}  ${r.by}${r.tags ? `  [${r.tags.join(', ')}]  prompt ${r.plen} chars` : ''}\n      ${r.url}`);
}
console.log(`\n${rows.length} shown. Analyze one: node ref.mjs <link> (downloads the video, saves the prompt to refs/<name>/prompt.md).`);
