// The one place that talks to Postgres. Every query goes through
// parameterized statements ($1, $2 …) — never string-built SQL.
import pg from 'pg';
import { config } from '../config.js';

let pool = null;

export function getPool() {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not set');
  if (!pool) {
    pool = new pg.Pool({
      connectionString: config.databaseUrl,
      // 'no-verify': encrypted, but accepts the self-signed certificate of
      // Railway's public database proxy.
      ssl: config.databaseSsl ? { rejectUnauthorized: config.databaseSsl === 'verify' } : false,
      max: 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
    pool.on('error', (error) => console.error('[db] idle client error:', error.message));
  }
  return pool;
}

export function query(text, params = []) {
  return getPool().query(text, params);
}

/** Runs `fn(client)` in a transaction; rolls back if it throws. */
export async function transaction(fn) {
  const client = await getPool().connect();
  // A checked-out client has no error listener of the pool: if the connection
  // drops (database restart), its "error" event would end the whole process.
  const onError = (error) => console.error('[db] connection lost during a transaction:', error.message);
  client.on('error', onError);
  let broken = null;
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch((rollbackError) => {
      broken = rollbackError;
    });
    throw error;
  } finally {
    client.off('error', onError);
    // A connection that couldn't even roll back is discarded, not reused.
    client.release(broken ?? undefined);
  }
}

export async function closePool() {
  if (pool) {
    const current = pool;
    pool = null;
    await current.end();
  }
}
