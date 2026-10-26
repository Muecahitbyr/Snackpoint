// Brute-force protection for the login, kept in the database so it holds
// across restarts and instances. Locks escalate the longer an attack goes on:
//
//   per account (since its last successful login)
//     5 failures within 15 min  → locked until 15 min after the first of them
//    15 failures within 24 h    → locked for 1 h after the last one
//    30 failures within 24 h    → locked for 24 h after the last one
//   per IP address
//    20 failures within 15 min  → blocked until 15 min after the first of them
//    60 failures within 24 h    → blocked for 24 h after the last one
import { query } from '../db/pool.js';
import { HttpError } from '../lib/errors.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export async function assertLoginAllowed(ip, identifier) {
  const { rows } = await query(
    `WITH last_success AS (
       SELECT coalesce(max(created_at), '-infinity') AS at FROM login_attempts WHERE identifier = $2 AND success
     ),
     account AS (
       SELECT created_at FROM login_attempts, last_success
        WHERE identifier = $2 AND NOT success AND created_at > now() - interval '24 hours' AND created_at > last_success.at
     ),
     address AS (
       SELECT created_at FROM login_attempts WHERE ip = $1 AND NOT success AND created_at > now() - interval '24 hours'
     )
     SELECT
       (SELECT count(*)::int FROM account WHERE created_at > now() - interval '15 minutes') AS account_15m,
       (SELECT min(created_at) FROM account WHERE created_at > now() - interval '15 minutes') AS account_15m_first,
       (SELECT count(*)::int FROM account) AS account_24h,
       (SELECT max(created_at) FROM account) AS account_last,
       (SELECT count(*)::int FROM address WHERE created_at > now() - interval '15 minutes') AS ip_15m,
       (SELECT min(created_at) FROM address WHERE created_at > now() - interval '15 minutes') AS ip_15m_first,
       (SELECT count(*)::int FROM address) AS ip_24h,
       (SELECT max(created_at) FROM address) AS ip_last`,
    [ip, identifier]
  );
  const r = rows[0];
  const at = (value, offset) => (value ? new Date(value).getTime() + offset : 0);
  const lockedUntil = Math.max(
    r.account_15m >= 5 ? at(r.account_15m_first, 15 * MINUTE) : 0,
    r.account_24h >= 30 ? at(r.account_last, 24 * HOUR) : r.account_24h >= 15 ? at(r.account_last, HOUR) : 0,
    r.ip_15m >= 20 ? at(r.ip_15m_first, 15 * MINUTE) : 0,
    r.ip_24h >= 60 ? at(r.ip_last, 24 * HOUR) : 0
  );
  const remaining = lockedUntil - Date.now();
  if (remaining > 0) {
    const minutes = Math.ceil(remaining / MINUTE);
    const wait = minutes > 90 ? `${Math.ceil(minutes / 60)} Stunden` : `${minutes} Minuten`;
    const error = new HttpError(429, `Zu viele Fehlversuche. Die Anmeldung ist für ${wait} gesperrt.`);
    error.retryAfter = Math.ceil(remaining / 1000);
    throw error;
  }
}

export async function recordLoginAttempt(ip, identifier, success) {
  await query('INSERT INTO login_attempts (ip, identifier, success) VALUES ($1, $2, $3)', [ip, identifier, success]);
  await query(`DELETE FROM login_attempts WHERE created_at < now() - interval '7 days'`);
}
