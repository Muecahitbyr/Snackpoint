// Product wishes: visitors suggest products and vote; the team approves and
// manages them in the admin panel. Nothing personal is collected — a visitor
// is only known by an HMAC of their IP address (one vote per wish, rate limits).
import { createHmac } from 'node:crypto';
import { Hono } from 'hono';
import { z } from 'zod';
import { assertSameOrigin } from '../auth/session.js';
import { config } from '../config.js';
import { query, transaction } from '../db/pool.js';
import { audit } from '../lib/audit.js';
import { HttpError, badRequest, conflict, mapDbError, notFound } from '../lib/errors.js';
import { clientIp } from '../lib/request.js';
import { parse, parseId, readJson, text, uuid } from '../lib/validation.js';

const PUBLIC_STATUSES = ['approved', 'planned', 'available'];
const VOTABLE_STATUSES = ['approved', 'planned'];
const UMLAUTS = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

/** "Takis  Blue-Heat!" → "takisblueheat" — the same wish, however it's typed. */
export function normalizeWish(name) {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, (char) => UMLAUTS[char])
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');
}

const cleanName = (name) => name.replace(/\s+/g, ' ').trim();
const LINK = /(https?:\/\/|www\.|[a-z0-9-]+\.(de|com|net|org|io|shop|info|eu)\b|@[a-z0-9-]+\.)/i;

/** Pseudonymous visitor key: HMAC of the IP, keyed with a server secret. */
function visitorKey(c) {
  const secret = config.proxySecret || 'snackpoint-local-dev';
  return createHmac('sha256', `wishes:${secret}`).update(clientIp(c)).digest('hex');
}

const tooMany = (message) => new HttpError(429, message);

const iso = (value) => (value ? new Date(value).toISOString() : null);

// ── Public ────────────────────────────────────────────────────────────────

export const publicWishes = new Hono();

publicWishes.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});

publicWishes.get('/', async (c) => {
  const { rows } = await query(
    `SELECT w.id, w.name, w.status, w.mentions,
            (SELECT count(*)::int FROM wish_votes v WHERE v.wish_id = w.id) AS votes,
            EXISTS (SELECT 1 FROM wish_votes v WHERE v.wish_id = w.id AND v.voter_hash = $2) AS voted
       FROM product_wishes w
      WHERE w.status = ANY($1)
      ORDER BY (w.status = 'available'), votes DESC, w.mentions DESC, w.created_at
      LIMIT 60`,
    [PUBLIC_STATUSES, visitorKey(c)]
  );
  return c.json({ items: rows });
});

const submitSchema = z.object({
  name: z.string().max(200),
  note: text(300).optional(),
  // Honeypot: a field people never see. Bots fill it in.
  website: z.string().max(500).optional(),
});

publicWishes.post('/', async (c) => {
  assertSameOrigin(c);
  const data = parse(submitSchema, await readJson(c));
  if (data.website) return c.json({ ok: true, message: 'Danke! Dein Wunsch ist angekommen.' });

  const name = cleanName(data.name);
  const note = (data.note ?? '').trim();
  if (name.length < 2 || name.length > 80) {
    throw badRequest('Bitte gib einen Produktnamen mit 2 bis 80 Zeichen ein.', { fields: { name: '2 bis 80 Zeichen' } });
  }
  if (LINK.test(name) || LINK.test(note)) {
    throw badRequest('Bitte keine Links oder E-Mail-Adressen.', { fields: { name: 'Keine Links' } });
  }
  const normalized = normalizeWish(name);
  if (normalized.length < 2) throw badRequest('Bitte gib einen Produktnamen ein.', { fields: { name: 'Produktname fehlt' } });

  const voter = visitorKey(c);
  const wish = await transaction(async (db) => {
    // One submission per visitor at a time, so parallel requests can't all pass the limit.
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`wish:${voter}`]);
    const { rows: limits } = await db.query(
      `SELECT count(*) FILTER (WHERE created_at > now() - interval '1 hour')::int AS hour,
              count(*)::int AS day
         FROM wish_submissions WHERE voter_hash = $1 AND created_at > now() - interval '24 hours'`,
      [voter]
    );
    if (limits[0].hour >= 5 || limits[0].day >= 15) {
      throw tooMany('Du hast gerade schon einige Wünsche geschickt. Versuch es später noch einmal.');
    }
    const { rows } = await db.query(
      `INSERT INTO product_wishes (name, normalized_name, note) VALUES ($1, $2, $3)
       ON CONFLICT (normalized_name) DO UPDATE SET mentions = product_wishes.mentions + 1
       RETURNING id, status, (xmax = 0) AS created`,
      [name, normalized, note]
    );
    await db.query('INSERT INTO wish_submissions (voter_hash) VALUES ($1)', [voter]);
    await db.query(`DELETE FROM wish_submissions WHERE created_at < now() - interval '1 day'`);
    // Asking for a wish that's already on the list counts as a vote for it.
    if (VOTABLE_STATUSES.includes(rows[0].status)) {
      await db.query('INSERT INTO wish_votes (wish_id, voter_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING', [rows[0].id, voter]);
    }
    return rows[0];
  });

  if (wish.created) {
    return c.json({ ok: true, message: 'Danke! Dein Wunsch ist angekommen und erscheint nach einer kurzen Prüfung in der Liste.' }, 201);
  }
  if (VOTABLE_STATUSES.includes(wish.status)) {
    return c.json({ ok: true, votedId: wish.id, message: 'Das wünschen sich schon andere. Wir haben deine Stimme dazugezählt!' });
  }
  if (wish.status === 'available') {
    return c.json({ ok: true, message: 'Gute Nachricht: Das gibt es schon bei uns im Laden!' });
  }
  return c.json({ ok: true, message: 'Danke! Dein Wunsch ist angekommen.' });
});

async function assertVotable(id) {
  const { rows } = await query('SELECT status FROM product_wishes WHERE id = $1', [id]);
  if (!rows[0] || !VOTABLE_STATUSES.includes(rows[0].status)) throw notFound('Diesen Wunsch gibt es nicht (mehr).');
}

const voteCount = async (id) => (await query('SELECT count(*)::int AS n FROM wish_votes WHERE wish_id = $1', [id])).rows[0].n;

publicWishes.post('/:id/vote', async (c) => {
  assertSameOrigin(c);
  const id = parseId(c.req.param('id'));
  await assertVotable(id);
  const voter = visitorKey(c);
  const { rows } = await query(
    `SELECT count(*)::int AS n FROM wish_votes WHERE voter_hash = $1 AND created_at > now() - interval '1 hour'`,
    [voter]
  );
  if (rows[0].n >= 40) throw tooMany('Das waren viele Stimmen auf einmal. Versuch es später noch einmal.');
  await query('INSERT INTO wish_votes (wish_id, voter_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, voter]);
  return c.json({ votes: await voteCount(id), voted: true });
});

publicWishes.delete('/:id/vote', async (c) => {
  assertSameOrigin(c);
  const id = parseId(c.req.param('id'));
  await assertVotable(id);
  await query('DELETE FROM wish_votes WHERE wish_id = $1 AND voter_hash = $2', [id, visitorKey(c)]);
  return c.json({ votes: await voteCount(id), voted: false });
});

// ── Admin (owner + developer) ─────────────────────────────────────────────

const wishJson = (row) => ({
  id: row.id,
  name: row.name,
  note: row.note,
  status: row.status,
  mentions: row.mentions,
  votes: row.votes,
  createdAt: iso(row.created_at),
  updatedAt: iso(row.updated_at),
});

const WISH_SELECT = `SELECT w.*, (SELECT count(*)::int FROM wish_votes v WHERE v.wish_id = w.id) AS votes FROM product_wishes w`;
const STATUS_LABELS = { new: 'neu', approved: 'freigegeben', planned: 'geplant', available: 'im Laden', rejected: 'abgelehnt' };

export const adminWishes = new Hono();

adminWishes.get('/', async (c) => {
  const { rows } = await query(`${WISH_SELECT} ORDER BY w.created_at DESC LIMIT 1000`);
  return c.json({ items: rows.map(wishJson) });
});

const updateSchema = z.object({
  name: text(80).min(2).optional(),
  note: text(300).optional(),
  status: z.enum(['new', 'approved', 'planned', 'available', 'rejected']).optional(),
});

adminWishes.patch('/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  const data = parse(updateSchema, await readJson(c));
  const name = data.name ? cleanName(data.name) : null;
  let row;
  try {
    ({ rows: [row] } = await query(
      `UPDATE product_wishes SET name = coalesce($2, name), normalized_name = coalesce($3, normalized_name),
         note = coalesce($4, note), status = coalesce($5, status)
       WHERE id = $1 RETURNING *`,
      [id, name, name ? normalizeWish(name) : null, data.note ?? null, data.status ?? null]
    ));
  } catch (error) {
    if (error.code === '23505') throw conflict('Einen Wunsch mit diesem Namen gibt es schon. Nutze „Zusammenführen“.');
    throw mapDbError(error);
  }
  if (!row) throw notFound();
  const change = data.status ? `Status: ${STATUS_LABELS[data.status]}` : 'bearbeitet';
  await audit(c, 'update', 'wish', id, `${row.name} (${change})`);
  const { rows } = await query(`${WISH_SELECT} WHERE w.id = $1`, [id]);
  return c.json({ item: wishJson(rows[0]) });
});

// Folds a duplicate into another wish: votes and mentions move over.
adminWishes.post('/:id/merge', async (c) => {
  const id = parseId(c.req.param('id'));
  const { targetId } = parse(z.object({ targetId: uuid }), await readJson(c));
  if (id === targetId) throw badRequest('Ein Wunsch kann nicht mit sich selbst zusammengeführt werden.');
  const names = await transaction(async (db) => {
    const { rows } = await db.query('SELECT id, name, mentions FROM product_wishes WHERE id = ANY($1) FOR UPDATE', [[id, targetId]]);
    const source = rows.find((row) => row.id === id);
    const target = rows.find((row) => row.id === targetId);
    if (!source || !target) throw notFound();
    await db.query(
      `INSERT INTO wish_votes (wish_id, voter_hash, created_at)
       SELECT $2, voter_hash, created_at FROM wish_votes WHERE wish_id = $1 ON CONFLICT DO NOTHING`,
      [id, targetId]
    );
    await db.query('UPDATE product_wishes SET mentions = mentions + $2 WHERE id = $1', [targetId, source.mentions]);
    await db.query('DELETE FROM product_wishes WHERE id = $1', [id]);
    return { source: source.name, target: target.name };
  });
  await audit(c, 'update', 'wish', targetId, `„${names.source}“ in „${names.target}“ zusammengeführt`);
  const { rows } = await query(`${WISH_SELECT} WHERE w.id = $1`, [targetId]);
  return c.json({ item: wishJson(rows[0]) });
});

adminWishes.delete('/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  const { rows } = await query('DELETE FROM product_wishes WHERE id = $1 RETURNING name', [id]);
  if (!rows[0]) throw notFound();
  await audit(c, 'delete', 'wish', id, rows[0].name);
  return c.json({ ok: true });
});
