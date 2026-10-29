// Cloudflare Worker in front of the website. Assets come straight from dist/
// (Static Assets); this script only sees the paths listed under
// run_worker_first in wrangler.jsonc:
//
//   /api/*    passed on to the backend on Railway. To the browser everything
//             stays on one domain, so the admin's session cookie
//             (SameSite=Strict) and the CSRF checks work unchanged, no CORS.
//   the public pages (/, /produkte, /impressum, /datenschutz)
//             rendered with the current products, events and opening hours,
//             so search engines and AI crawlers that don't run JavaScript see
//             what the admin panel shows right now, not the state of the last
//             deployment. If the API doesn't answer in time, the page goes out
//             as built (dist/, prerendered by scripts/prerender.mjs).
//   /index.html, /produkte.html, /produkte/, …   301 to the clean URL.
//   /robots.txt, /sitemap.xml        for preview URLs and old domains.
//
// Configuration (see ADMIN.md):
//   API_ORIGIN      var     e.g. https://snackpoint-api.up.railway.app
//   PROXY_SECRET    secret  same value as on Railway (wrangler secret put PROXY_SECRET)
//   REDIRECT_HOSTS  var     optional, after moving to an own domain: old host
//                           names (comma-separated) whose pages 301 to SETTINGS.siteUrl
import { EMPTY_SITE, PUBLIC_PAGES, REGION_END, REGION_START, SETTINGS, renderRegion } from '../build/ssr/prerender.js';

const SITE = new URL(SETTINGS.siteUrl);
const PAGE_BY_PATH = new Map(PUBLIC_PAGES.map((page) => [page.path, page]));
// /produkte.html and /produkte/ → /produkte (Cloudflare itself answers with a temporary 307).
const CLEAN_URLS = new Map(
  PUBLIC_PAGES.flatMap((page) => [[`/${page.file}`, page.path], ...(page.path === '/' ? [] : [[`${page.path}/`, page.path]])])
);
// How long a page waits for the API before it goes out as built. Until then
// visitors see a blank page, so keep it short: the API answers in about 150 ms
// (measured live: median 148 ms, max 318 ms).
const API_TIMEOUT_MS = 1500;
// Rendering time grows with the catalog (measured: under 1 ms with 65 products,
// about 9 ms for /produkte with 1000). Larger payloads would risk the 10 ms CPU
// limit of the free Workers plan, so the page then goes out as built.
const MAX_LIVE_BYTES = 200_000;
// name in wrangler.jsonc: preview URLs look like <version>-snackpoint.<account>.workers.dev
const WORKER_NAME = 'snackpoint';

// _headers doesn't apply to responses built here, so the pages get the same
// headers as every other file (public/_headers, "/*").
const PAGE_HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=0, must-revalidate',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
};

const unescapeHtml = (text) => text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Version previews and the like: never indexed. */
const isPreviewHost = (host) => host.endsWith('.workers.dev') && host.split('.')[0].endsWith(`-${WORKER_NAME}`);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return proxyApi(request, env, ctx, url);

    const redirectHosts = (env.REDIRECT_HOSTS ?? '').split(',').map((host) => host.trim()).filter(Boolean);
    if (redirectHosts.includes(url.hostname) && url.hostname !== SITE.hostname) {
      // Concatenated, not resolved: a path like "//other.host" must stay a path.
      return Response.redirect(`${SITE.origin}${url.pathname}${url.search}`, 301);
    }
    if (CLEAN_URLS.has(url.pathname)) {
      return Response.redirect(new URL(CLEAN_URLS.get(url.pathname) + url.search, url), 301);
    }
    const preview = isPreviewHost(url.hostname);
    if (url.pathname === '/robots.txt' && preview) {
      return new Response('# Preview: not for search engines.\nUser-agent: *\nDisallow: /\n', {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' },
      });
    }

    const page = PAGE_BY_PATH.get(url.pathname);
    if (!page || request.method !== 'GET') return env.ASSETS.fetch(request);
    return renderPage(page, request, env, ctx, { preview, host: url.host });
  },
};

async function loadSite(env, host) {
  const response = await fetch(new URL('/api/public/site', env.API_ORIGIN), {
    headers: { Accept: 'application/json', 'X-Proxy-Secret': env.PROXY_SECRET, 'X-Original-Host': host },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`API: HTTP ${response.status}`);
  const text = await response.text();
  if (text.length > MAX_LIVE_BYTES) throw new Error(`API: ${text.length} Zeichen, zu groß für das Rendern im Worker`);
  return JSON.parse(text);
}

/**
 * The built page with its data-dependent part (between the <!--ssr-->
 * markers) rendered again from the current API data. <head> goes out at once,
 * so the browser already loads scripts, styles and fonts while the data is on
 * its way.
 */
async function renderPage(page, request, env, ctx, { preview, host }) {
  const asset = await env.ASSETS.fetch(new Request(new URL(page.path, request.url)));
  if (!asset.ok) return asset;
  const html = await asset.text();
  const headers = new Headers(PAGE_HEADERS);
  if (preview) headers.set('X-Robots-Tag', 'noindex');

  const start = html.indexOf(REGION_START);
  const end = html.indexOf(REGION_END);
  if (start < 0 || end < start || !env.API_ORIGIN || !env.PROXY_SECRET) return new Response(html, { headers });

  const regionEnd = end + REGION_END.length;
  // The browser gets the data inside the page, a preload would load it twice.
  const head = html.slice(0, start).replace(/[ \t]*<link rel="preload" href="\/api\/public\/site"[^>]*>\n?/, '');
  const built = html.slice(start, regionEnd);
  const tail = html.slice(regionEnd);
  const title = unescapeHtml(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
  const description = unescapeHtml(head.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');

  const { readable, writable } = new TransformStream();
  ctx.waitUntil(
    (async () => {
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      try {
        await writer.write(encoder.encode(head));
        let region;
        try {
          const site = { ...EMPTY_SITE, ...(await loadSite(env, host)) };
          region = renderRegion(page.name, site, { siteUrl: SITE.origin, title, description, inlineData: true });
        } catch (error) {
          console.error(`${page.path}: Stand vom Build ausgeliefert`, error);
          region = built;
        }
        await writer.write(encoder.encode(region + tail));
        await writer.close();
      } catch (error) {
        await writer.abort(error).catch(() => {});
      }
    })()
  );
  return new Response(readable, { headers });
}

async function proxyApi(request, env, ctx, url) {
  if (!env.API_ORIGIN || !env.PROXY_SECRET) {
    return Response.json({ error: 'API nicht konfiguriert.' }, { status: 503 });
  }

  // Images never change under the same URL (?v=<checksum>): keep them in
  // Cloudflare's cache so they don't hit the database every time. (Cloudflare
  // documents the Cache API for own domains; on *.workers.dev it may do nothing.)
  const cacheable = request.method === 'GET' && url.pathname.startsWith('/api/media/') && url.searchParams.has('v');
  const cache = caches.default;
  if (cacheable) {
    const hit = await cache.match(request);
    if (hit) return hit;
  }

  const target = new URL(url.pathname + url.search, env.API_ORIGIN);
  const upstream = new Request(target, request);
  upstream.headers.set('X-Proxy-Secret', env.PROXY_SECRET);
  upstream.headers.set('X-Original-Host', url.host);
  upstream.headers.set('X-Client-IP', request.headers.get('CF-Connecting-IP') ?? '');

  let response;
  try {
    response = await fetch(upstream, { redirect: 'manual' });
  } catch {
    return Response.json({ error: 'Der Server ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.' }, { status: 502 });
  }
  if (cacheable && response.status === 200) ctx.waitUntil(cache.put(request, response.clone()));
  return response;
}
