// Applies server/db/migrations/*.sql in name order, each one exactly once and
// inside its own transaction. Migrations only ever add — nothing here drops
// data. An advisory lock keeps two runs from racing each other.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getPool } from './pool.js';

const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations/', import.meta.url));
const LOCK_ID = 727_001;

export async function migrate({ log = console.log } = {}) {
  const client = await getPool().connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_ID]);
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'
    );
    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.version));
    const files = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql')).sort();
    let count = 0;

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (applied.has(version)) continue;
      const sql = readFileSync(MIGRATIONS_DIR + file, 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`Migration ${file} failed: ${error.message}`);
      }
      log(`  ✓ ${file}`);
      count += 1;
    }
    log(count ? `${count} migration(s) applied.` : 'Database schema is up to date.');
    return count;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_ID]).catch(() => {});
    client.release();
  }
}
