// Full logical backup of the website data as one gzip-compressed JSON file
// (all content, images and admin accounts; no sessions or login attempts).
// Downloaded from the admin panel, restored with `npm run db:restore`.
// Works on any Railway plan — no pg_dump or volume snapshots needed.
import { Readable } from 'node:stream';
import { createGunzip, createGzip } from 'node:zlib';
import { query, transaction } from '../db/pool.js';

export const FORMAT = 'snackpoint-backup';
export const VERSION = 1;

// Parents before children, so a restore can insert in this order.
export const TABLES = [
  'admin_users', 'media', 'product_groups', 'product_categories', 'products', 'events', 'event_images',
  'banners', 'promotions', 'services', 'reviews', 'opening_hours', 'site_content', 'settings',
  'product_wishes', 'wish_votes', 'audit_log',
];
const BATCHED = new Set(['media']); // large rows: read a few at a time
const BATCH = 20;

function encodeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = Buffer.isBuffer(value) ? { $bytes: value.toString('base64') } : value;
  }
  return out;
}

async function* tableRows(table) {
  if (!BATCHED.has(table)) {
    const { rows } = await query(`SELECT * FROM ${table}`);
    yield* rows;
    return;
  }
  let after = '00000000-0000-0000-0000-000000000000';
  for (;;) {
    const { rows } = await query(`SELECT * FROM ${table} WHERE id > $1 ORDER BY id LIMIT ${BATCH}`, [after]);
    if (!rows.length) return;
    yield* rows;
    after = rows[rows.length - 1].id;
  }
}

async function* backupChunks() {
  const { rows } = await query('SELECT max(version) AS version FROM schema_migrations');
  yield `{"format":${JSON.stringify(FORMAT)},"version":${VERSION},"createdAt":${JSON.stringify(new Date().toISOString())},"schema":${JSON.stringify(rows[0].version)},"tables":{`;
  for (const [t, table] of TABLES.entries()) {
    yield `${t ? ',' : ''}${JSON.stringify(table)}:[`;
    let first = true;
    for await (const row of tableRows(table)) {
      yield `${first ? '' : ','}${JSON.stringify(encodeRow(row))}`;
      first = false;
    }
    yield ']';
  }
  yield '}}';
}

/** The backup as a gzip stream (Node Readable). */
export function createBackupStream() {
  return Readable.from(backupChunks()).pipe(createGzip({ level: 6 }));
}

export async function markBackupDone() {
  await query(
    `INSERT INTO settings (key, value) VALUES ('_last_backup', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [{ at: new Date().toISOString() }]
  );
}

export async function lastBackupAt() {
  const { rows } = await query(`SELECT value FROM settings WHERE key = '_last_backup'`);
  return rows[0]?.value?.at ?? null;
}

/** Reads a backup file (gzip or plain JSON) from a Node stream. */
export async function readBackup(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  let buffer = Buffer.concat(chunks);
  if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
    const unzipped = [];
    for await (const chunk of Readable.from([buffer]).pipe(createGunzip())) unzipped.push(chunk);
    buffer = Buffer.concat(unzipped);
  }
  const data = JSON.parse(buffer.toString('utf8'));
  if (data.format !== FORMAT || data.version !== VERSION || typeof data.tables !== 'object') {
    throw new Error('Das ist keine SnackPoint-Sicherung (oder eine nicht unterstützte Version).');
  }
  return data;
}

/**
 * Replaces ALL website data with the backup's content, in one transaction
 * (nothing changes if anything fails). Column names are checked against the
 * live schema, so a crafted file can't inject SQL.
 */
export async function restoreBackup(data, { log = console.log } = {}) {
  return transaction(async (db) => {
    const { rows: columnRows } = await db.query(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [TABLES]
    );
    const columns = new Map(TABLES.map((table) => [table, new Set()]));
    for (const row of columnRows) columns.get(row.table_name).add(row.column_name);

    await db.query(`TRUNCATE ${[...TABLES, 'admin_sessions', 'login_attempts', 'wish_submissions'].join(', ')} RESTART IDENTITY CASCADE`);
    const counts = {};
    for (const table of TABLES) {
      const rows = data.tables[table] ?? [];
      for (const row of rows) {
        const keys = Object.keys(row).filter((key) => columns.get(table).has(key));
        const values = keys.map((key) => (row[key] && typeof row[key] === 'object' && '$bytes' in row[key] ? Buffer.from(row[key].$bytes, 'base64') : row[key]));
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        await db.query(`INSERT INTO ${table} (${keys.map((key) => `"${key}"`).join(', ')}) VALUES (${placeholders})`, values);
      }
      counts[table] = rows.length;
    }
    await db.query(`SELECT setval(pg_get_serial_sequence('audit_log', 'id'), coalesce((SELECT max(id) FROM audit_log), 0) + 1, false)`);
    log(Object.entries(counts).map(([table, n]) => `  ✓ ${table}: ${n}`).join('\n'));
    return counts;
  });
}
