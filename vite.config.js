import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { getRequestListener } from '@hono/node-server';

// Pretty URLs for the extra pages — Cloudflare (wrangler.jsonc) and server/node.js do the
// same in production.
const PAGE_REWRITES = {
  '/admin': '/admin.html',
  '/admin/': '/admin.html',
  '/produkte': '/produkte.html',
  '/impressum': '/impressum.html',
  '/datenschutz': '/datenschutz.html',
};

function rewritePages(req, _res, next) {
  const [path, query] = req.url.split('?');
  if (PAGE_REWRITES[path]) req.url = PAGE_REWRITES[path] + (query ? `?${query}` : '');
  next();
}

/** Serves the API (server/app.js) from the Vite dev/preview server, so
 * `npm run dev` runs website, admin and backend together. */
function apiServer() {
  const attach = (server, loadApp) => {
    server.middlewares.use(rewritePages);
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/')) return next();
      try {
        const { app } = await loadApp();
        await getRequestListener(app.fetch)(req, res);
      } catch (error) {
        next(error);
      }
    });
  };
  return {
    name: 'snackpoint-api',
    // Dev: loaded through Vite, so server code changes apply on the next request.
    configureServer: (server) => attach(server, () => server.ssrLoadModule('/server/app.js')),
    configurePreviewServer: (server) => attach(server, () => import('./server/app.js')),
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react(), apiServer()],
  // `vite build --ssr src/prerender.jsx` (part of npm run build): the server
  // renderer for scripts/prerender.mjs and worker/index.js. Not a website file,
  // so it lives outside dist/ and without a copy of public/.
  build: isSsrBuild ? { outDir: 'build/ssr', copyPublicDir: false } : {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        impressum: resolve(import.meta.dirname, 'impressum.html'),
        datenschutz: resolve(import.meta.dirname, 'datenschutz.html'),
        produkte: resolve(import.meta.dirname, 'produkte.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
      },
    },
  },
}));
