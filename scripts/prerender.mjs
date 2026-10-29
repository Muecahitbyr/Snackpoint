// Runs at the end of `npm run build`, after `vite build` (dist/) and
// `vite build --ssr` (build/ssr/). For every public page it
//   - adds canonical link and Open Graph / Twitter tags to <head>,
//   - renders the React page to static HTML plus JSON-LD (src/prerender.jsx),
//     between <!--ssr--> markers that worker/index.js later fills with
//     current data on every request,
// and writes dist/sitemap.xml and dist/robots.txt. Everything URL-related comes
// from SETTINGS.siteUrl in src/data/siteContent.js.
//
// Products, events and opening hours live in the database: the script reads
// them from the live API (read-only GET). This snapshot is only the fallback
// the Worker serves when the API is down. If the API can't be reached during
// the build, the pages are prerendered without them and the build still succeeds.
import { readFile, writeFile } from 'node:fs/promises';

process.env.NODE_ENV = 'production'; // React's server renderer without dev warnings

const DIST = new URL('../dist/', import.meta.url);
const { renderRegion, CONTENT, SETTINGS, PUBLIC_PAGES, EMPTY_SITE } = await import('../build/ssr/prerender.js');

const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unescapeHtml = (text) => text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const siteUrl = SETTINGS.siteUrl;
if (!/^https?:\/\/[^/]+$/.test(siteUrl)) throw new Error(`SETTINGS.siteUrl ist keine gültige Adresse: ${siteUrl}`);
if (!siteUrl.startsWith('https://')) console.warn(`⚠ Testbuild für ${siteUrl}: so nicht veröffentlichen.`);

async function loadSiteData() {
  const url = process.env.PRERENDER_API ?? `${siteUrl}/api/public/site`;
  if (url === 'off') return EMPTY_SITE;
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`⚠ Prerender: ${url} nicht erreichbar (${error.message}), Seiten ohne Produkte/Events/Öffnungszeiten.`);
    return EMPTY_SITE;
  }
}

function headTags({ url, title, description }) {
  const image = `${siteUrl}${CONTENT['brand.logo']}`;
  return [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:locale" content="de_DE" />`,
    `<meta property="og:site_name" content="${escapeHtml(CONTENT['brand.fullName'])}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(`${CONTENT['brand.name']} Logo`)}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ].map((tag) => `    ${tag}`).join('\n');
}

const site = await loadSiteData();

for (const page of PUBLIC_PAGES) {
  const file = new URL(page.file, DIST);
  let html = await readFile(file, 'utf8');
  if (html.includes('<!--ssr-->')) throw new Error(`${page.file} ist schon vorgerendert. Erst neu bauen (npm run build).`);
  const title = unescapeHtml(html.match(/<title>([^<]*)<\/title>/)[1]);
  const description = unescapeHtml(html.match(/<meta name="description" content="([^"]*)"/)[1]);
  const url = `${siteUrl}${page.path}`;

  const region = renderRegion(page.name, site, { siteUrl, title, description });
  html = html
    .replace('</head>', `${headTags({ url, title, description })}\n  </head>`)
    .replace('<div id="root"></div>', () => region);
  await writeFile(file, html);
  console.log(`✓ ${page.path.padEnd(13)} ${Math.round(region.length / 1024)} KB HTML`);
}

const urls = PUBLIC_PAGES.map((page) => `  <url><loc>${siteUrl}${page.path}</loc></url>`).join('\n');
await writeFile(new URL('sitemap.xml', DIST), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
await writeFile(
  new URL('robots.txt', DIST),
  [
    '# SnackPoint Kaufbeuren',
    '# All public pages may be crawled, by search engines and AI search crawlers',
    '# alike. The website itself loads its content from /api/public/ and images',
    '# from /api/media/; everything else under /api/ is internal (admin, login).',
    '# The admin panel sends "noindex" itself.',
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Allow: /api/public/',
    'Allow: /api/media/',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
);
console.log('✓ sitemap.xml, robots.txt');
