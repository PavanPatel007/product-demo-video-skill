// prompt-motion.com: a curated gallery of Opus 5.5 motion films, each with the creator's prompt,
// tags and original post. Plain fetch + regex (no dependencies). Prompts and videos belong to their
// creators: read them for grammar, link to the entry, never copy them into a repo.
export const SITE = 'https://prompt-motion.com';

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
  e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m);
const toText = (html) => decode(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n'))
  .replace(/\n\s*\n+/g, '\n');

async function get(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 product-demo-video' } });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.text();
}

export const isEntry = (u) => /^https?:\/\/(www\.)?prompt-motion\.com\/[a-z0-9_-]+-[0-9a-f]{6}\/?$/i.test(u);

// Every film on the home page, in the site's order: { rank, title, by, url, badges }.
export async function listGallery() {
  const html = await get(SITE + '/');
  return [...html.matchAll(/<li class="masonry-item"[\s\S]*?<\/li>/g)].map((m, rank) => {
    const a = m[0].match(/aria-label="([^"]*)" class="group block[^"]*" href="(\/[^"]+)"/);
    if (!a) return null;
    const [title, by] = decode(a[1]).split(/, by @/);
    return { rank, title, by: by ? '@' + by : '', url: SITE + a[2], badges: [...m[0].matchAll(/data-slot="badge"[^>]*>([^<]+)</g)].map((b) => b[1]) };
  }).filter(Boolean);
}

// One entry: { title, by, tags, prompt, video, post, model, stack, effort, posted }.
export async function readEntry(url) {
  const html = await get(url), text = toText(html), lines = text.split('\n').map((l) => l.trim());
  const title = decode(html.match(/<title>([^<]*?)(?: · Prompt Motion)?<\/title>/)?.[1] || '');
  const ti = lines.indexOf(title), tags = [];
  if (ti >= 0) for (const l of lines.slice(ti + 1, ti + 12)) { if (/^(Prompt|Skill|Customize|Copied)$/.test(l)) break; if (l && !/stronger version/i.test(l)) tags.push(l); }
  const field = (k) => { const i = lines.indexOf(k); return i >= 0 ? lines[i + 1] : ''; };
  return {
    title, tags,
    by: html.match(/href="https:\/\/(?:x|twitter)\.com\/([^/"]+)\/status/)?.[1] ? '@' + html.match(/href="https:\/\/(?:x|twitter)\.com\/([^/"]+)\/status/)[1] : '',
    prompt: (text.match(/\nCopy\n([\s\S]*?)\n(?:Show all|This prompt was|Model\n)/)?.[1] || '').trim(),
    video: html.match(/https:\/\/media\.prompt-motion\.com\/[^"'\s\\)]+\/video\.[^"'\s\\)]+\.mp4/)?.[0] || '',
    post: html.match(/href="(https:\/\/(?:x|twitter)\.com\/[^"]+\/status\/\d+[^"]*)"/)?.[1] || '',
    model: field('Model'), stack: field('Stack'), effort: field('Effort'), posted: field('Posted'),
  };
}
