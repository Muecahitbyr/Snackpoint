// Brute-force protection for the login, kept in the database so it holds
// across serverless instances: max 5 failed attempts per account and 20 per
// IP address within 15 minutes.
import { query } from '../db/pool.js';
import { HttpError } from '../lib/errors.js';

const WINDOW_MINUTES = 15;
const MAX_PER_ACCOUNT = 5;
const MAX_PER_IP = 20;

export async function assertLoginAllowed(ip, identifier) {
  const { rows } = await query(
    `SELECT
       (SELECT count(*)::int FROM login_attempts
         WHERE identifier = $2 AND NOT success AND created_at > now() - make_interval(mins => $3)
           AND created_at > coalesce((SELECT max(created_at) FROM login_attempts WHERE identifier = $2 AND success), '-infinity')
       ) AS account_failures,
       (SELECT count(*)::int FROM login_attempts
         WHERE ip = $1 AND NOT success AND created_at > now() - make_interval(mins => $3)) AS ip_failures,
       (SELECT min(created_at) FROM login_attempts
         WHERE (ip = $1 OR identifier = $2) AND NOT success AND created_at > now() - make_interval(mins => $3)) AS oldest`,
    [ip, identifier, WINDOW_MINUTES]
  );
  const { account_failures: account, ip_failures: byIp, oldest } = rows[0];
  if (account >= MAX_PER_ACCOUNT || byIp >= MAX_PER_IP) {
    const retryAfter = oldest ? Math.max(60, Math.ceil((new Date(oldest).getTime() + WINDOW_MINUTES * 60_000 - Date.now()) / 1000)) : WINDOW_MINUTES * 60;
    const error = new HttpError(429, `Zu viele Fehlversuche. Bitte warte ${Math.ceil(retryAfter / 60)} Minuten.`);
    error.retryAfter = retryAfter;
    throw error;
  }
}

export async function recordLoginAttempt(ip, identifier, success) {
  await query('INSERT INTO login_attempts (ip, identifier, success) VALUES ($1, $2, $3)', [ip, identifier, success]);
  await query(`DELETE FROM login_attempts WHERE created_at < now() - interval '7 days'`);
}
