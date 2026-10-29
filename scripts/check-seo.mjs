// Checks what search engines and AI crawlers get from a running site, without
// JavaScript and read-only (GET requests only):
//   robots.txt (per crawler), sitemap.xml, status codes and redirects,
//   title / description / canonical / Open Graph, one <h1>, JSON-LD,
//   noindex on the admin, internal links.
//
// Usage: npm run cf:dev            (other terminal: Worker + build on :8787)
//        npm run test:seo          (or: node scripts/check-seo.mjs <base-url>)
const BASE = (process.argv[2] ?? 'http://localhost:8787').replace(/\/$/, '');

// Official user-agent tokens, see docs/seo-geo-final-audit.md for sources.
const SEARCH_CRAWLERS = ['Googlebot', 'Bingbot', 'OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Applebot', 'DuckDuckBot'];

let failures = 0;
const check = (ok, message) => {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${message}`);
  return ok;
};

async function get(path, options = {}) {
  const response = await fetch(BASE + path, { redirect: 'manual', headers: { 'User-Agent': 'SnackPoint-SEO-Check' }, ...options });
  return { status: response.status, headers: response.headers, text: await response.text() };
}

// --- robots.txt (RFC 9309: most specific user-agent group, longest match wins)
function robotsGroups(text) {
  const groups = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (!line) continue;
    if (/^user-agent$/i.test(key)) {
      if (!current || current.rules.length) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
    } else if (/^(allow|disallow)$/i.test(key) && current) {
      current.rules.push({ allow: /^allow$/i.test(key), path: value });
    }
  }
  return groups;
}

function robotsAllows(groups, agent, path) {
  const token = agent.toLowerCase();
  const group = groups.find((g) => g.agents.includes(token)) ?? groups.find((g) => g.agents.includes('*'));
  if (!group) return true;
  let best = null;
  for (const rule of group.rules) {
    if (!rule.path) continue;
    const pattern = new RegExp(`^${rule.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$')}`);
    if (pattern.test(path) && (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow))) best = rule;
  }
  return best ? best.allow : true;
}

const robots = await get('/robots.txt');
check(robots.status === 200 && robots.headers.get('content-type')?.startsWith('text/plain'), 'robots.txt: 200, text/plain');
const siteUrl = robots.text.match(/^Sitemap:\s*(\S+)\/sitemap\.xml$/m)?.[1];
check(Boolean(siteUrl), `robots.txt nennt die Sitemap (${siteUrl})`);
const groups = robotsGroups(robots.text);
for (const agent of SEARCH_CRAWLERS) {
  const ok = ['/', '/produkte', '/api/public/site', '/api/media/x'].every((path) => robotsAllows(groups, agent, path))
    && !robotsAllows(groups, agent, '/api/admin/products');
  check(ok, `robots.txt: ${agent} darf die Seiten lesen, nicht /api/admin`);
}

// --- sitemap.xml
const sitemap = await get('/sitemap.xml');
check(sitemap.status === 200 && /xml/.test(sitemap.headers.get('content-type') ?? ''), 'sitemap.xml: 200, XML');
const locs = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
check(locs.length > 0 && locs.every((loc) => loc.startsWith(`${siteUrl}/`)), `sitemap.xml: ${locs.length} URLs, alle auf ${siteUrl}`);
if (siteUrl?.startsWith('https://')) check(!/localhost|127\.0\.0\.1/.test(sitemap.text + robots.text), 'keine localhost-Adressen');

// --- the pages
const meta = (html, pattern) => [...html.matchAll(pattern)].map((match) => match[1]);
const titles = new Set();
const descriptions = new Set();
const links = new Set();

for (const loc of locs) {
  const path = loc.slice(siteUrl.length) || '/';
  const { status, headers, text: html } = await get(path);
  const label = `${path}:`;
  if (!check(status === 200 && headers.get('content-type')?.startsWith('text/html'), `${label} 200, HTML`)) continue;
  const title = meta(html, /<title>([^<]*)<\/title>/g);
  const description = meta(html, /<meta name="description" content="([^"]*)"/g);
  const canonical = meta(html, /<link rel="canonical" href="([^"]*)"/g);
  check(title.length === 1 && description.length === 1 && canonical.length === 1, `${label} je genau ein title, description, canonical`);
  check(canonical[0] === loc, `${label} canonical = ${loc}`);
  check(meta(html, /<meta property="og:url" content="([^"]*)"/g)[0] === loc, `${label} og:url = canonical`);
  check(['og:title', 'og:description', 'og:image'].every((name) => html.includes(`property="${name}"`)) && html.includes('name="twitter:card"'), `${label} Open Graph und Twitter Card`);
  check(/<html lang="de">/.test(html), `${label} lang="de"`);
  check(!/noindex/i.test(html) && !/noindex/i.test(headers.get('x-robots-tag') ?? ''), `${label} indexierbar`);
  check((html.match(/<h1[\s>]/g) ?? []).length === 1, `${label} genau eine <h1> im HTML`);
  check(!/Jetzt geöffnet|Geschlossen ·|In \d+ Tagen|>Morgen<|>Heute<|Läuft gerade/.test(html), `${label} keine zeitabhängigen Zustände im HTML`);
  titles.add(title[0]);
  descriptions.add(description[0]);

  const blocks = meta(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (check(blocks.length === 1, `${label} genau ein JSON-LD-Block`)) {
    try {
      const data = JSON.parse(blocks[0]);
      const graph = data['@graph'] ?? [];
      const ids = new Set(graph.map((node) => node['@id']).filter(Boolean));
      const refs = JSON.stringify(graph).match(/\{"@id":"[^"]+"\}/g) ?? [];
      const missing = refs.map((ref) => JSON.parse(ref)['@id']).filter((id) => !ids.has(id));
      check(data['@context'] === 'https://schema.org' && graph.every((node) => node['@type']), `${label} JSON-LD gültig (${graph.map((node) => node['@type']).join(', ')})`);
      check(missing.length === 0, `${label} alle @id-Verweise aufgelöst${missing.length ? `: ${missing}` : ''}`);
      check(graph.every((node) => !JSON.stringify(node).includes('aggregateRating') && !JSON.stringify(node).includes('"review"')), `${label} keine selbst ausgezeichneten Bewertungen`);
      for (const event of graph.filter((node) => node['@type'] === 'Event')) {
        check(event.name && !Number.isNaN(Date.parse(event.startDate)) && event.location?.address, `${label} Event „${event.name}“: name, startDate, location.address`);
      }
      for (const list of graph.filter((node) => node['@type'] === 'BreadcrumbList' || node['@type'] === 'ItemList')) {
        check(list.itemListElement.every((item, i) => item.position === i + 1 && item.name), `${label} ${list['@type']}: Positionen 1…${list.itemListElement.length}`);
      }
    } catch (error) {
      check(false, `${label} JSON-LD lässt sich nicht lesen: ${error.message}`);
    }
  }
  for (const [, href] of html.matchAll(/<a [^>]*href="(\/[^"#]*)/g)) links.add(href || '/');
}
check(titles.size === locs.length && descriptions.size === locs.length, 'Titel und Beschreibungen sind auf jeder Seite verschieden');

// --- duplicates, non-public areas, errors
for (const [from, to] of [['/index.html', '/'], ['/produkte.html', '/produkte'], ['/produkte/', '/produkte'], ['/events', '/#events']]) {
  const { status, headers } = await get(from);
  check(status === 301 && new URL(headers.get('location'), BASE).href === new URL(to, BASE).href, `${from} → 301 ${to}`);
}
const admin = await get('/admin');
check(/noindex/.test(admin.headers.get('x-robots-tag') ?? '') && /<meta name="robots" content="noindex/.test(admin.text), '/admin: noindex (Header und Meta-Tag)');
const api = await get('/api/admin/products');
check(api.status === 401 || api.status === 403, `/api/admin/products ohne Login: ${api.status}`);
check(/noindex/.test(api.headers.get('x-robots-tag') ?? ''), '/api: X-Robots-Tag noindex');
check((await get('/gibt-es-nicht')).status === 404, '/gibt-es-nicht: 404');

// --- internal links
for (const link of links) {
  const { status } = await get(link);
  check(status === 200, `Link ${link}: ${status}`);
}

console.log(failures ? `\n${failures} Prüfung(en) fehlgeschlagen.` : '\nAlle Prüfungen bestanden.');
process.exit(failures ? 1 : 0);
