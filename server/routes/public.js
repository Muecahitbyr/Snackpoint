// Public, read-only endpoints for the website: no login, no admin data.
import { Hono } from 'hono';
import { query } from '../db/pool.js';
import { notFound } from '../lib/errors.js';
import { buildPublicSite } from '../lib/publicSite.js';
import { parseId } from '../lib/validation.js';

export const publicApi = new Hono();

publicApi.get('/site', async (c) => {
  const site = await buildPublicSite();
  // Browsers always ask again; the CDN keeps a copy for a few seconds and
  // falls back to it for a day if the database is unreachable.
  c.header('Cache-Control', 'public, max-age=0, must-revalidate');
  c.header('CDN-Cache-Control', 'public, max-age=5, stale-if-error=86400');
  return c.json(site);
});

export const mediaApi = new Hono();

async function sendMedia(c, variant) {
  const id = parseId(c.req.param('id'));
  const columns = variant === 'thumb' ? 'thumb AS bytes, thumb_mime_type AS mime' : 'data AS bytes, mime_type AS mime';
  const { rows } = await query(`SELECT ${columns}, checksum FROM media WHERE id = $1`, [id]);
  const image = rows[0];
  if (!image) throw notFound('Bild nicht gefunden.');
  const etag = `"${image.checksum.slice(0, 32)}${variant === 'thumb' ? '-t' : ''}"`;
  // URLs carry the checksum (?v=…), so a versioned URL never changes content.
  const versioned = c.req.query('v') === image.checksum.slice(0, 12);
  c.header('Cache-Control', versioned ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  c.header('ETag', etag);
  c.header('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
  if (c.req.header('if-none-match') === etag) return c.body(null, 304);
  c.header('Content-Type', image.mime);
  return c.body(image.bytes);
}

mediaApi.get('/:id', (c) => sendMedia(c, 'full'));
mediaApi.get('/:id/thumb', (c) => sendMedia(c, 'thumb'));
