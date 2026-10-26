// Cloudflare Worker in front of the website. Pages and assets come straight
// from dist/ (Static Assets); only /api/* reaches this script and is passed
// on to the backend on Railway. To the browser everything stays on one
// domain, so the admin's session cookie (SameSite=Strict) and the CSRF
// checks work unchanged — no CORS needed.
//
// Configuration (see ADMIN.md):
//   API_ORIGIN    var     e.g. https://snackpoint-api.up.railway.app
//   PROXY_SECRET  secret  same value as on Railway (wrangler secret put PROXY_SECRET)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!env.API_ORIGIN || !env.PROXY_SECRET) {
      return Response.json({ error: 'API nicht konfiguriert.' }, { status: 503 });
    }

    // Images never change under the same URL (?v=<checksum>): keep them in
    // Cloudflare's cache so they don't hit the database every time.
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
  },
};
