// node scan-code.mjs [repo]          (default: the user's folder recorded in .pdv.json)
// Read-only map of the product's own code, so the film uses its exact colors, fonts, icons, copy and
// screens. Only run it after the user said yes in the intake. Never runs, builds or edits the repo,
// never follows symlinks, and never opens .env, key or credential files. Writes assets/code/:
//   code.json   framework, design tokens (CSS variables, Tailwind colors, iOS / Android colors),
//               fonts, icon library, screens and routes, copy files, and the files worth reading
//   svg/ fonts/ icons/ copy/   copies of logo and brand SVGs, font files, app icons, English copy
import { copyFileSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { positional, workspace } from './lib/env.mjs';

const repo = resolve(positional()[0] || workspace()?.root || '.');
const OUT = 'assets/code';
for (const d of ['svg', 'fonts', 'icons', 'copy']) mkdirSync(join(OUT, d), { recursive: true });

const SKIP_DIR = /^(node_modules|\.git|\.next|\.nuxt|\.svelte-kit|\.turbo|\.vercel|\.cache|\.expo|\.gradle|\.idea|\.venv|venv|__pycache__|dist|build|out|coverage|target|vendor|Pods|DerivedData|storybook-static|\.dart_tool)$/;
const SECRET = /(^|\/)\.env|\.(pem|key|p12|p8|keystore|jks|mobileprovision)$|id_rsa|secret|credential|password|GoogleService-Info\.plist$|google-services\.json$|\.npmrc$|\.netrc$/i;
const files = [];
(function walk(dir, depth) {
  if (depth > 12 || files.length > 30000) return;
  let list; try { list = readdirSync(dir); } catch { return; }
  for (const f of list) {
    const p = join(dir, f);
    let st; try { st = lstatSync(p); } catch { continue; }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) { if (!SKIP_DIR.test(f)) walk(p, depth + 1); }
    else if (!SECRET.test(relative(repo, p))) files.push({ p, rel: relative(repo, p), size: st.size });
  }
})(repo, 0);
const read = (f) => (f.size < 600000 ? readFileSync(f.p, 'utf8') : '');
const find = (re) => files.filter((f) => re.test(f.rel));
const copy = (f, sub, name = basename(f.rel)) => { const to = join(OUT, sub, name); copyFileSync(f.p, to); return relative(OUT, to); };
const uniq = (a) => [...new Set(a)];

// framework, UI kit, icon library
const deps = {};
for (const f of find(/(^|\/)package\.json$/)) { try { const j = JSON.parse(read(f)); Object.assign(deps, j.dependencies, j.devDependencies); } catch {} }
const has = (re) => Object.keys(deps).filter((d) => re.test(d));
const stack = uniq([
  ...has(/^(next|react|vue|nuxt|svelte|@sveltejs\/kit|@angular\/core|react-native|expo|solid-js|astro|@remix-run\/react)$/),
  ...has(/^(tailwindcss|@mui\/material|@chakra-ui\/react|antd|styled-components|@emotion\/react|@mantine\/core)$/),
  ...(find(/(^|\/)components\.json$/).length ? ['shadcn/ui'] : []),
  ...(find(/(^|\/)pubspec\.yaml$/).length ? ['flutter'] : []),
  ...(find(/\.swift$/).length ? ['swift'] : []),
  ...(find(/(^|\/)build\.gradle(\.kts)?$/).length ? ['android'] : []),
]);
const icons = has(/^(lucide-react|lucide|lucide-vue-next|@heroicons\/react|@phosphor-icons\/react|phosphor-react|react-icons|@tabler\/icons-react|@radix-ui\/react-icons|@mui\/icons-material|@fortawesome\/.+|iconoir-react|@iconify\/react|react-native-vector-icons|@expo\/vector-icons|sf-symbols.*)$/);

// design tokens
const cssVars = {};
for (const f of find(/\.(css|scss|sass|less|pcss)$/)) {
  for (const [, sel, body] of read(f).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const vars = [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+)/g)];
    if (!vars.length) continue;
    const key = sel.trim().split('\n').pop().trim().slice(0, 60);
    cssVars[key] ||= {};
    for (const [, k, v] of vars) cssVars[key][k] = v.trim();
  }
}
const tailwind = {};
for (const f of find(/(^|\/)tailwind\.config\.(js|ts|cjs|mjs)$/))
  for (const [, k, v] of read(f).matchAll(/['"]?([\w-]+)['"]?\s*:\s*['"](#[0-9a-fA-F]{3,8}|(?:rgb|hsl|oklch)a?\([^)]*\))['"]/g)) tailwind[k] = v;
const hex = (c) => '#' + c.map((v) => Math.round(Math.min(1, v) * 255).toString(16).padStart(2, '0')).join('');
const iosColors = {};
for (const f of find(/\.colorset\/Contents\.json$/)) {
  try {
    const j = JSON.parse(read(f)), name = f.rel.match(/([^/]+)\.colorset/)[1];
    iosColors[name] = j.colors.map((c) => {
      const k = c.color?.components || {}, n = (v) => (String(v).startsWith('0x') ? parseInt(v, 16) / 255 : Number(v) > 1 ? Number(v) / 255 : Number(v));
      return { appearance: c.appearances?.[0]?.value || 'any', hex: hex([n(k.red), n(k.green), n(k.blue)]) };
    });
  } catch {}
}
const androidColors = {};
for (const f of find(/res\/values[^/]*\/colors\.xml$/)) for (const [, k, v] of read(f).matchAll(/<color name="([^"]+)">([^<]+)<\/color>/g)) androidColors[k] = v.trim();

// fonts
const fontFiles = find(/\.(woff2?|ttf|otf)$/).filter((f) => f.size < 3e6).slice(0, 40).map((f) => copy(f, 'fonts'));
const nextFonts = uniq(find(/\.(t|j)sx?$/).flatMap((f) => {
  const s = read(f); if (!s.includes('next/font')) return [];
  return [...s.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]next\/font\/google['"]/g)].flatMap((m) => m[1].split(',').map((x) => x.trim().split(/\s+as\s+/)[0].replace(/_/g, ' ')));
})).filter(Boolean);
const cssFontFamilies = uniq(find(/\.(css|scss)$/).flatMap((f) => [...read(f).matchAll(/@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^;'"]+)/g)].map((m) => m[1].trim())));

// brand art: logo / brand SVGs, favicons, app icons
const svgs = find(/\.svg$/).filter((f) => /logo|brand|wordmark|mark|symbol|favicon|icon\.svg/i.test(f.rel) && f.size < 200000).slice(0, 60)
  .map((f) => copy(f, 'svg', f.rel.replace(/[\\/]/g, '__')));
const appIcons = [
  ...find(/(^|\/)(public|static|app|src\/app)\/(favicon|icon|apple-icon|apple-touch-icon|logo)[^/]*\.(png|ico|svg)$/),
  ...find(/AppIcon\.appiconset\/[^/]+\.png$/).sort((a, b) => b.size - a.size).slice(0, 1),
  ...find(/mipmap-xxxhdpi\/ic_launcher[^/]*\.(png|webp)$/).slice(0, 2),
].map((f) => copy(f, 'icons', f.rel.replace(/[\\/]/g, '__')));

// screens and routes
const route = (rel, re) => '/' + rel.replace(re, '').split('/').filter((s) => !/^\(.*\)$|^@/.test(s)).join('/').replace(/\/index$|^index$/, '');
const screens = uniq([
  ...find(/(^|\/)app\/(.+\/)?page\.(tsx|jsx|ts|js|mdx)$/).map((f) => route(f.rel, /^(.*\/)?app\/|\/?page\.\w+$/g)),
  ...find(/(^|\/)pages\/.+\.(tsx|jsx|ts|js|vue)$/).filter((f) => !/(^|\/)(_app|_document|_error|api\/)/.test(f.rel.split('pages/').pop())).map((f) => route(f.rel, /^(.*\/)?pages\/|\.\w+$/g)),
  ...find(/(^|\/)src\/routes\/(.+\/)?\+page\.svelte$/).map((f) => route(f.rel, /^(.*\/)?src\/routes\/?|\/?\+page\.svelte$/g)),
  ...find(/\.(tsx|jsx|ts|js)$/).filter((f) => /src\//.test(f.rel)).flatMap((f) => [...read(f).matchAll(/(?:<Route[^>]*\spath=|\bpath:\s*)['"](\/[^'"]*)['"]/g)].map((m) => m[1])),
  ...find(/\.swift$/).flatMap((f) => [...read(f).matchAll(/struct\s+(\w+(?:View|Screen))\s*:\s*View\b/g)].map((m) => 'SwiftUI ' + m[1])),
  ...find(/\.dart$/).flatMap((f) => [...read(f).matchAll(/class\s+(\w+(?:Screen|Page))\s+extends/g)].map((m) => 'Flutter ' + m[1])),
  ...find(/\.kt$/).flatMap((f) => [...read(f).matchAll(/@Composable\s+fun\s+(\w+(?:Screen|Page))\s*\(/g)].map((m) => 'Compose ' + m[1])),
]).slice(0, 200);

// copy (English strings) and the files worth reading
const copyFiles = find(/((^|\/)(locales?|i18n|lang|messages|translations)\/(.+\/)?(en|en[-_](US|GB))(\/[^/]+)?\.(json|ya?ml|po)$|(^|\/)en\.(json|ya?ml)$|res\/values\/strings\.xml$|en\.lproj\/Localizable\.strings$|(^|\/)Localizable\.xcstrings$)/)
  .filter((f) => f.size < 1e6).slice(0, 10).map((f) => copy(f, 'copy', f.rel.replace(/[\\/]/g, '__')));
const worth = [
  ...find(/(^|\/)README\.md$/).slice(0, 1),
  ...find(/(^|\/)tailwind\.config\.(js|ts|cjs|mjs)$|(^|\/)(theme|tokens|colors|palette|typography|design-tokens)\.(ts|tsx|js|json|dart|swift|kt)$|(^|\/)globals?\.css$/),
  ...find(/(^|\/)(components|ui|screens|views|features)\/.+\.(tsx|jsx|vue|svelte|swift|dart|kt)$/).filter((f) => f.size < 60000).slice(0, 150),
].map((f) => f.rel);

let name = '';
try { name = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')).name || ''; } catch {}
const result = { repo, name, stack, icons, tokens: { cssVars, tailwind, iosColors, androidColors },
  fonts: { files: fontFiles, nextFontGoogle: nextFonts, cssFontFaces: cssFontFamilies }, svg: svgs, appIcons, screens, copy: copyFiles, read: worth };
writeFileSync(join(OUT, 'code.json'), JSON.stringify(result, null, 1));

const nVars = Object.values(cssVars).reduce((n, v) => n + Object.keys(v).length, 0);
console.log(`scanned ${repo} (${files.length} files, read-only)`);
console.log(`  stack: ${stack.join(', ') || 'unknown'}${icons.length ? ` · icons: ${icons.join(', ')}` : ''}`);
console.log(`  tokens: ${nVars} CSS variables in ${Object.keys(cssVars).length} scopes, ${Object.keys(tailwind).length} Tailwind colors, ${Object.keys(iosColors).length} iOS colors, ${Object.keys(androidColors).length} Android colors`);
console.log(`  fonts: ${fontFiles.length} files${nextFonts.length ? `, next/font: ${nextFonts.join(', ')}` : ''}${cssFontFamilies.length ? `, @font-face: ${cssFontFamilies.join(', ')}` : ''}`);
console.log(`  brand art: ${svgs.length} SVGs, ${appIcons.length} app icons · ${screens.length} screens/routes · ${copyFiles.length} copy files · ${worth.length} files worth reading`);
console.log(`-> ${OUT}/code.json`);
