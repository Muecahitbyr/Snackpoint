// The API: one Hono app used by the Node server (server/node.js, on Railway)
// and the Vite dev server (vite.config.js). In production the browser talks
// to it through the Cloudflare Worker (worker/index.js) on the site's domain.
//
//   /api/public/*  read-only website data         (no login)
//   /api/media/*   images                          (no login)
//   /api/auth/*    login / logout / password       (login + CSRF where needed)
//   /api/admin/*   everything that changes data    (login + CSRF, always)
import { timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { secureHeaders } from 'hono/secure-headers';
import { requireAdmin, requireDeveloper } from './auth/session.js';
import { config } from './config.js';
import { HttpError } from './lib/errors.js';
import { auth } from './routes/auth.js';
import { mediaApi, publicApi } from './routes/public.js';
import { banners, categories, events, groups, products, promotions } from './routes/adminEntities.js';
import { auditLog, backup, dashboard, hours, mediaAdmin, meta } from './routes/adminSite.js';
import { users } from './routes/users.js';

// Connection-level failures (network codes and Postgres "unavailable" classes).
const DB_UNAVAILABLE = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'EAI_AGAIN', '08001', '08004', '08006', '53300', '57P01', '57P02', '57P03',
]);

export function createApp() {
  const app = new Hono().basePath('/api');

  // With PROXY_SECRET set, only the Cloudflare Worker may call the API
  // (Railway's health check excepted).
  app.use('*', async (c, next) => {
    if (!config.proxySecret) return next();
    const sent = Buffer.from(c.req.header('x-proxy-secret') ?? '');
    const expected = Buffer.from(config.proxySecret);
    if (sent.length === expected.length && timingSafeEqual(sent, expected)) {
      c.set('viaProxy', true);
      c.set('siteHost', c.req.header('x-original-host') ?? null);
      return next();
    }
    if (c.req.path === '/api/health') return next();
    return c.json({ error: 'Nicht gefunden.' }, 404);
  });
  app.use('*', secureHeaders({ crossOriginResourcePolicy: 'same-origin', xFrameOptions: 'DENY' }));
  app.use('*', async (c, next) => {
    c.header('X-Robots-Tag', 'noindex');
    await next();
  });
  // JSON bodies are small; media uploads get their own, larger limit.
  app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/api/admin/media')) return next();
    return bodyLimit({ maxSize: 512 * 1024, onError: () => { throw new HttpError(413, 'Anfrage zu groß.'); } })(c, next);
  });

  app.get('/health', (c) => c.json({ ok: true }));
  app.route('/public', publicApi);
  app.route('/media', mediaApi);
  app.route('/auth', auth);

  const admin = new Hono();
  admin.use('*', requireAdmin);
  // Daily business — every account (role "owner" and "developer").
  admin.route('/dashboard', dashboard);
  admin.route('/meta', meta);
  admin.route('/products', products);
  admin.route('/groups', groups);
  admin.route('/categories', categories);
  admin.route('/events', events);
  admin.route('/banners', banners);
  admin.route('/promotions', promotions);
  admin.route('/hours', hours);
  admin.route('/media', mediaAdmin);
  // Change log, accounts, backups — developer only.
  for (const path of ['/audit', '/users', '/backup']) {
    admin.use(path, requireDeveloper);
    admin.use(`${path}/*`, requireDeveloper);
  }
  admin.route('/audit', auditLog);
  admin.route('/users', users);
  admin.route('/backup', backup);
  app.route('/admin', admin);

  app.notFound((c) => c.json({ error: 'Nicht gefunden.' }, 404));

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      if (error.retryAfter) c.header('Retry-After', String(error.retryAfter));
      return c.json({ error: error.message, ...(error.details ?? {}) }, error.status);
    }
    // Unexpected: log the cause server-side, tell the client nothing internal.
    const ref = crypto.randomUUID().slice(0, 8);
    console.error(`[api] ${ref} ${c.req.method} ${c.req.path}:`, error?.stack ?? error);
    const unavailable = DB_UNAVAILABLE.has(error?.code) || /timeout|terminated|connection/i.test(String(error?.message));
    return c.json(
      { error: unavailable ? 'Die Datenbank ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.' : 'Interner Fehler.', ref },
      unavailable ? 503 : 500
    );
  });

  return app;
}

export const app = createApp();
