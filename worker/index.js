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
//             Data and rendered pages are kept for 5 s in the isolate's memory
//             and dropped right after a successful change in the admin panel.
//   /index.html, /produkte.html, /produkte/, …   301 to the clean URL.
//   /robots.txt, /sitemap.xml        for preview URLs and old domains.
//
// Configuration (see ADMIN.md):
//   API_ORIGIN      var     e.g. https://snackpoint-api.up.railway.app
//   PROXY_SECRET    secret  same value as on Railway (wrangler secret put PROXY_SECRET)
//   REDIRECT_HOSTS  var     optional, after moving to an own domain: old host
//                           names (comma-separated) whose pages 301 to SETTINGS.siteUrl
import { EMPTY_SITE, PUBLIC_PAGES, REGION_END, REGION_START, SETTINGS, renderRegion, warmUp } from '../build/ssr/prerender.js';

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
// Rendering time grows with the catalog (about 6 times as long for /produkte
// with 1000 products as with today's 65). Larger payloads would risk the 10 ms
// CPU limit of the free Workers plan, so the page then goes out as built.
const MAX_LIVE_BYTES = 200_000;
// How long this isolate reuses the API data and the pages rendered from it.
// Nothing is cached in Cloudflare or the browser: the pages still go out with
// "max-age=0, must-revalidate".
const CACHE_TTL_MS = 5000;
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

// What the public pages may load: own files (incl. fonts) and, after consent,
// the Google Maps embed (maps.google.com redirects to www.google.com) and the
// TikTok and Instagram profile embeds. Inline
// scripts only by hash (scriptHashes); the JSON blocks aren't executed.
// data: and blob: only cover URLs the page creates itself (e.g. textures of
// the 3D character, if it's switched on again).
const contentSecurityPolicy = (scriptHashes) =>
  [
    "default-src 'self'",
    `script-src 'self' ${scriptHashes.map((hash) => `'sha256-${hash}'`).join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    "connect-src 'self' data: blob:",
    "worker-src 'self' blob:",
    'frame-src https://maps.google.com https://www.google.com https://www.tiktok.com https://www.instagram.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');

async function scriptHashes(html) {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  return Promise.all(
    scripts.map(async (script) => {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(script));
      return btoa(String.fromCharCode(...new Uint8Array(digest)));
    })
  );
}

const unescapeHtml = (text) => text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// Compile React and the components now, while the isolate starts, instead of
// in the first request (that alone took most of its CPU time).
try {
  warmUp(SITE.origin);
} catch (error) {
  console.error('Aufwärmen fehlgeschlagen', error);
}

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

// Per isolate: the built pages split at the <!--ssr--> markers (they only
// change with a deployment), the current API data and the regions rendered
// from it. Nothing here depends on host name or query string, so one visitor
// can't plant content for another.
const templates = new Map();
let current = null; // { expires, site, regions: Map<page name, region> }
let loading = null; // one API request at a time, shared by concurrent page views
let invalidations = 0;

/** Drops the cached data, e.g. after a change in the admin panel. */
function invalidate() {
  invalidations++;
  current = null;
  loading = null;
}

function siteData(env, host) {
  if (current && current.expires > Date.now()) return current;
  if (!loading) {
    const generation = invalidations;
    const promise = loadSite(env, host)
      .then((site) => {
        const entry = { expires: Date.now() + CACHE_TTL_MS, site: { ...EMPTY_SITE, ...site }, regions: new Map() };
        // Started before a change in the admin panel: good for this request, not for the next ones.
        if (generation === invalidations) current = entry;
        return entry;
      })
      .finally(() => {
        if (loading === promise) loading = null;
      });
    loading = promise;
  }
  return loading;
}

async function template(page, request, env) {
  if (templates.has(page.name)) return templates.get(page.name);
  const asset = await env.ASSETS.fetch(new Request(new URL(page.path, request.url)));
  if (!asset.ok) return null;
  const html = await asset.text();
  const csp = contentSecurityPolicy(await scriptHashes(html));
  const start = html.indexOf(REGION_START);
  const end = html.indexOf(REGION_END);
  if (start < 0 || end < start) return { html, csp };
  const regionEnd = end + REGION_END.length;
  const head = html.slice(0, start);
  const parts = {
    html,
    csp,
    // The browser gets the data inside the page, a preload would load it twice.
    head: head.replace(/[ \t]*<link rel="preload" href="\/api\/public\/site"[^>]*>\n?/, ''),
    built: html.slice(start, regionEnd),
    tail: html.slice(regionEnd),
    title: unescapeHtml(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? ''),
    description: unescapeHtml(head.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''),
  };
  templates.set(page.name, parts);
  return parts;
}

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
  const parts = await template(page, request, env);
  if (!parts) return env.ASSETS.fetch(request);
  const headers = new Headers(PAGE_HEADERS);
  headers.set('Content-Security-Policy', parts.csp);
  if (preview) headers.set('X-Robots-Tag', 'noindex');
  if (!parts.head || !env.API_ORIGIN || !env.PROXY_SECRET) return new Response(parts.html, { headers });

  const { readable, writable } = new TransformStream();
  ctx.waitUntil(
    (async () => {
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      try {
        await writer.write(encoder.encode(parts.head));
        let region;
        try {
          const data = await siteData(env, host);
          region = data.regions.get(page.name);
          if (!region) {
            region = renderRegion(page.name, data.site, { siteUrl: SITE.origin, title: parts.title, description: parts.description, inlineData: true });
            data.regions.set(page.name, region);
          }
        } catch (error) {
          console.error(`${page.path}: Stand vom Build ausgeliefert`, error);
          region = parts.built;
        }
        await writer.write(encoder.encode(region + parts.tail));
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
  // A change saved in the admin panel (the API checked login and CSRF): show
  // it on the next page view instead of after CACHE_TTL_MS. Other isolates
  // catch up within CACHE_TTL_MS.
  if (response.ok && request.method !== 'GET' && request.method !== 'HEAD' && url.pathname.startsWith('/api/admin/')) invalidate();
  return response;
}
