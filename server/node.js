// Production server.
//   On Railway:  npm run start:api  → API only; the Cloudflare Worker serves
//                the website and forwards /api/* here.
//   Standalone:  npm run build && npm start → website + API on one port
//                (local production test or a plain VPS).
import { existsSync } from 'node:fs';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { app as api } from './app.js';

const apiOnly = process.argv.includes('--api-only');
const server = new Hono();
server.route('/', api);

if (!apiOnly && existsSync('dist')) {
  // Same headers public/_headers sets on Cloudflare.
  server.use('/admin*', async (c, next) => {
    await next();
    c.header('X-Frame-Options', 'DENY');
    c.header('X-Robots-Tag', 'noindex, nofollow');
    c.header('Referrer-Policy', 'same-origin');
    c.header('Cache-Control', 'no-store');
  });
  server.get('/admin', serveStatic({ path: './dist/admin.html' }));
  server.get('/admin/', serveStatic({ path: './dist/admin.html' }));
  server.get('/events', serveStatic({ path: './dist/events.html' }));
  server.use('/assets/*', async (c, next) => {
    await next();
    c.header('Cache-Control', 'public, max-age=31536000, immutable');
  });
  server.use('*', serveStatic({ root: './dist' }));
}
server.notFound((c) => c.text('Nicht gefunden', 404));

const port = Number(process.env.PORT || 3000);
serve({ fetch: server.fetch, port }, () =>
  console.log(`SnackPoint ${apiOnly ? 'API' : 'Webseite + API'} läuft auf Port ${port}`)
);
