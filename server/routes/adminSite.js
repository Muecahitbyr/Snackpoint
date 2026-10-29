// Admin endpoints for opening hours, the media library, the dashboard, the
// change log and backups.
import { Readable } from 'node:stream';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { query, transaction } from '../db/pool.js';
import { audit } from '../lib/audit.js';
import { createBackupStream, lastBackupAt, markBackupDone } from '../lib/backup.js';
import { CHAT_CATEGORIES } from '../lib/chatCategories.js';
import { HttpError, badRequest, conflict, mapDbError, notFound } from '../lib/errors.js';
import { optimizeUpload } from '../lib/images.js';
import { MEDIA_REFERENCES, mediaUrl } from '../lib/media.js';
import { parse, parseId, readJson, text } from '../lib/validation.js';

const iso = (value) => (value ? new Date(value).toISOString() : null);

// ── Lookup data for forms (every role) ──────────────────────────────────────

export const meta = new Hono();

meta.get('/', (c) => c.json({ chatCategories: CHAT_CATEGORIES }));

// ── Opening hours ──────────────────────────────────────────────────────────

const TIME = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Format HH:MM');
const hoursSchema = z.object({
  days: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), open: TIME, close: TIME, closed: z.boolean() }))
    .length(7),
});

const hoursJson = (row) => ({
  weekday: row.weekday,
  day: row.day_name,
  open: row.open_time,
  close: row.close_time,
  closed: row.is_closed,
});

export const hours = new Hono();

hours.get('/', async (c) => {
  const { rows } = await query('SELECT * FROM opening_hours ORDER BY position');
  return c.json({ days: rows.map(hoursJson) });
});

hours.put('/', async (c) => {
  const { days } = parse(hoursSchema, await readJson(c));
  if (new Set(days.map((day) => day.weekday)).size !== 7) throw badRequest('Jeder Wochentag muss genau einmal vorkommen.');
  const errors = {};
  days.forEach((day, i) => {
    if (!day.closed && day.close <= day.open) errors[`days.${i}.close`] = 'Schließzeit muss nach der Öffnungszeit liegen';
  });
  if (Object.keys(errors).length) throw badRequest('Bitte überprüfe die Zeiten.', { fields: errors });
  await transaction(async (db) => {
    for (const day of days) {
      await db.query('UPDATE opening_hours SET open_time = $2, close_time = $3, is_closed = $4 WHERE weekday = $1', [
        day.weekday, day.open, day.close, day.closed,
      ]);
    }
  });
  await audit(c, 'update', 'opening_hours', '', 'Öffnungszeiten');
  const { rows } = await query('SELECT * FROM opening_hours ORDER BY position');
  return c.json({ days: rows.map(hoursJson) });
});

// ── Media library ──────────────────────────────────────────────────────────

const USAGE_COUNT_SQL = MEDIA_REFERENCES.map(
  (ref) => `(SELECT count(*) FROM ${ref.table} r WHERE r.${ref.column} = m.id)`
).join(' + ');

const mediaJson = (row) => ({
  id: row.id,
  originalName: row.original_name,
  altText: row.alt_text,
  mimeType: row.mime_type,
  width: row.width,
  height: row.height,
  sizeBytes: row.size_bytes,
  url: mediaUrl(row.id, row.checksum),
  thumbUrl: mediaUrl(row.id, row.checksum, 'thumb'),
  usageCount: Number(row.usage_count ?? 0),
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

const MEDIA_COLUMNS = `m.id, m.original_name, m.alt_text, m.mime_type, m.width, m.height, m.size_bytes, m.checksum,
  m.created_at, m.updated_at, (${USAGE_COUNT_SQL})::int AS usage_count`;

async function fetchMedia(id) {
  const { rows } = await query(`SELECT ${MEDIA_COLUMNS} FROM media m WHERE m.id = $1`, [id]);
  if (!rows[0]) throw notFound('Bild nicht gefunden.');
  return mediaJson(rows[0]);
}

async function mediaUsage(id) {
  const parts = await Promise.all(
    MEDIA_REFERENCES.map(async (ref) => {
      const name = ref.nameColumn ? `r.${ref.nameColumn}` : `(SELECT title FROM events e WHERE e.id = r.event_id)`;
      const { rows } = await query(`SELECT ${name} AS name FROM ${ref.table} r WHERE r.${ref.column} = $1`, [id]);
      return rows.map((row) => ({ type: ref.label, name: row.name }));
    })
  );
  return parts.flat();
}

/** The uploaded file from a multipart body, size-checked. */
async function uploadedFile(c) {
  const body = await c.req.parseBody();
  const file = body.file;
  if (!file || typeof file === 'string') throw badRequest('Keine Datei ausgewählt.');
  if (file.size > config.maxUploadBytes) {
    throw new HttpError(413, `Die Datei ist zu groß (max. ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB).`);
  }
  return { file, buffer: Buffer.from(await file.arrayBuffer()), alt: typeof body.alt === 'string' ? body.alt.trim().slice(0, 200) : '' };
}

const uploadLimit = bodyLimit({
  maxSize: config.maxUploadBytes + 256 * 1024,
  onError: () => {
    throw new HttpError(413, `Die Datei ist zu groß (max. ${Math.round(config.maxUploadBytes / 1024 / 1024)} MB).`);
  },
});

export const mediaAdmin = new Hono();

mediaAdmin.get('/', async (c) => {
  const search = (c.req.query('search') ?? '').trim().slice(0, 100);
  const { rows } = await query(
    `SELECT ${MEDIA_COLUMNS} FROM media m
      WHERE $1 = '' OR m.original_name ILIKE '%' || $1 || '%' OR m.alt_text ILIKE '%' || $1 || '%'
      ORDER BY m.created_at DESC LIMIT 500`,
    [search.replace(/[%_\\]/g, (char) => `\\${char}`)]
  );
  return c.json({ items: rows.map(mediaJson), maxUploadBytes: config.maxUploadBytes });
});

mediaAdmin.get('/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  return c.json({ item: await fetchMedia(id), usage: await mediaUsage(id) });
});

mediaAdmin.post('/', uploadLimit, async (c) => {
  const { file, buffer, alt } = await uploadedFile(c);
  const image = await optimizeUpload(buffer);
  const { rows } = await query(
    `INSERT INTO media (original_name, alt_text, mime_type, width, height, size_bytes, checksum, data, thumb, thumb_mime_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      (file.name || 'bild').slice(0, 200), alt, image.mimeType, image.width, image.height, image.data.length,
      image.checksum, image.data, image.thumb, image.thumbMimeType,
    ]
  );
  await audit(c, 'create', 'media', rows[0].id, file.name);
  return c.json({ item: await fetchMedia(rows[0].id) }, 201);
});

// Replacing keeps the id, so every product/event using the image updates.
mediaAdmin.put('/:id/file', uploadLimit, async (c) => {
  const id = parseId(c.req.param('id'));
  await fetchMedia(id);
  const { file, buffer } = await uploadedFile(c);
  const image = await optimizeUpload(buffer);
  await query(
    `UPDATE media SET original_name = $2, mime_type = $3, width = $4, height = $5, size_bytes = $6, checksum = $7,
       data = $8, thumb = $9, thumb_mime_type = $10 WHERE id = $1`,
    [
      id, (file.name || 'bild').slice(0, 200), image.mimeType, image.width, image.height, image.data.length,
      image.checksum, image.data, image.thumb, image.thumbMimeType,
    ]
  );
  await audit(c, 'update', 'media', id, `Bild ersetzt: ${file.name}`);
  return c.json({ item: await fetchMedia(id) });
});

mediaAdmin.patch('/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  const data = parse(z.object({ altText: text(200).optional(), originalName: text(200).min(1).optional() }), await readJson(c));
  await fetchMedia(id);
  await query(
    'UPDATE media SET alt_text = coalesce($2, alt_text), original_name = coalesce($3, original_name) WHERE id = $1',
    [id, data.altText ?? null, data.originalName ?? null]
  );
  await audit(c, 'update', 'media', id, 'Bildinfo geändert');
  return c.json({ item: await fetchMedia(id) });
});

mediaAdmin.delete('/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  const item = await fetchMedia(id);
  const usage = await mediaUsage(id);
  if (usage.length) {
    const where = usage.slice(0, 3).map((use) => `${use.type} „${use.name}“`).join(', ');
    throw conflict(`Das Bild wird noch verwendet (${where}${usage.length > 3 ? ' …' : ''}). Entferne es dort zuerst.`);
  }
  try {
    await query('DELETE FROM media WHERE id = $1', [id]);
  } catch (error) {
    throw mapDbError(error, { inUseMessage: 'Das Bild wird noch verwendet.' });
  }
  await audit(c, 'delete', 'media', id, item.originalName);
  return c.json({ ok: true });
});

// ── Dashboard & change log ─────────────────────────────────────────────────

const auditJson = (row) => ({
  id: Number(row.id),
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  summary: row.summary,
  user: row.email ?? null,
  createdAt: iso(row.created_at),
});

export const dashboard = new Hono();

dashboard.get('/', async (c) => {
  const developer = c.get('session').user.role === 'developer';
  const [{ rows: counts }, { rows: recent }] = await Promise.all([
    query(`SELECT
      (SELECT count(*)::int FROM products) AS products,
      (SELECT count(*)::int FROM products WHERE is_active) AS active_products,
      (SELECT count(*)::int FROM products WHERE is_active AND is_highlight) AS highlights,
      (SELECT count(*)::int FROM products WHERE is_active AND availability <> 'available') AS flagged_products,
      (SELECT count(*)::int FROM product_categories) AS categories,
      (SELECT count(*)::int FROM events WHERE coalesce(ends_at, starts_at) >= now()) AS upcoming_events,
      (SELECT count(*)::int FROM events WHERE status = 'published' AND is_active) AS published_events,
      (SELECT count(*)::int FROM events WHERE status = 'draft') AS draft_events,
      (SELECT count(*)::int FROM banners WHERE is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())) AS live_banners,
      (SELECT count(*)::int FROM promotions WHERE is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())) AS live_promotions,
      (SELECT count(*)::int FROM media) AS media,
      (SELECT count(*)::int FROM product_wishes WHERE status = 'new') AS new_wishes,
      (SELECT count(*)::int FROM product_wishes WHERE status IN ('approved', 'planned')) AS open_wishes`),
    query(
      `SELECT a.*, u.email FROM audit_log a LEFT JOIN admin_users u ON u.id = a.admin_user_id
        WHERE a.action NOT IN ('login', 'logout') ORDER BY a.created_at DESC LIMIT 10`
    ),
  ]);
  const { rows: next } = await query(
    `SELECT id, title, starts_at, status FROM events WHERE coalesce(ends_at, starts_at) >= now() ORDER BY starts_at LIMIT 3`
  );
  return c.json({
    counts: counts[0],
    // Change log and backups are the developer's; owners get neither.
    lastBackupAt: developer ? await lastBackupAt() : undefined,
    recent: developer ? recent.map(auditJson) : undefined,
    nextEvents: next.map((row) => ({ id: row.id, title: row.title, startsAt: iso(row.starts_at), status: row.status })),
  });
});

export const auditLog = new Hono();

auditLog.get('/', async (c) => {
  // Whole numbers in a sane range: "1.5" or "1e30" would make Postgres fail.
  const limit = Math.min(Math.max(Math.trunc(Number(c.req.query('limit'))) || 50, 1), 200);
  const offset = Math.min(Math.max(Math.trunc(Number(c.req.query('offset'))) || 0, 0), 1_000_000);
  const { rows } = await query(
    `SELECT a.*, u.email FROM audit_log a LEFT JOIN admin_users u ON u.id = a.admin_user_id
      ORDER BY a.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return c.json({ items: rows.map(auditJson) });
});

// ── Backup download ────────────────────────────────────────────────────────

export const backup = new Hono();

backup.get('/', async (c) => {
  await markBackupDone();
  await audit(c, 'create', 'backup', '', 'Datensicherung heruntergeladen');
  const date = new Date().toISOString().slice(0, 10);
  c.header('Content-Type', 'application/gzip');
  c.header('Content-Disposition', `attachment; filename="snackpoint-backup-${date}.json.gz"`);
  c.header('Cache-Control', 'no-store');
  return c.body(Readable.toWeb(createBackupStream()));
});

// Login attempts of the last 7 days (developer only, via /audit/*): spot
// password guessing early. Passwords are never stored.
auditLog.get('/logins', async (c) => {
  const [{ rows }, { rows: summary }] = await Promise.all([
    query('SELECT identifier, ip, success, created_at FROM login_attempts ORDER BY created_at DESC LIMIT 200'),
    query(`SELECT
      count(*) FILTER (WHERE NOT success AND created_at > now() - interval '24 hours')::int AS failed_24h,
      count(*) FILTER (WHERE success AND created_at > now() - interval '24 hours')::int AS success_24h,
      count(DISTINCT ip) FILTER (WHERE NOT success AND created_at > now() - interval '24 hours')::int AS failed_ips_24h
      FROM login_attempts`),
  ]);
  return c.json({
    summary: summary[0],
    items: rows.map((row) => ({ identifier: row.identifier, ip: row.ip, success: row.success, createdAt: iso(row.created_at) })),
  });
});
