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
//
// Every attempt is recorded as failed *before* the check (startLoginAttempt),
// so parallel requests see each other: a burst can't get more password
// guesses past the limits than the same requests one after another.
import { query } from '../db/pool.js';
import { HttpError } from '../lib/errors.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Until when (ms timestamp, 0 = not locked) the account and/or IP is locked; ignores the attempt `ownId`. */
async function lockedUntil(ip, identifier, ownId = 0) {
  const { rows } = await query(
    `WITH last_success AS (
       SELECT coalesce(max(created_at), '-infinity') AS at FROM login_attempts WHERE identifier = $2 AND success
     ),
     account AS (
       SELECT created_at FROM login_attempts, last_success
        WHERE identifier = $2 AND NOT success AND created_at > now() - interval '24 hours' AND created_at > last_success.at
          AND id <> $3
     ),
     address AS (
       SELECT created_at FROM login_attempts
        WHERE ip = $1 AND NOT success AND created_at > now() - interval '24 hours' AND id <> $3
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
    [ip, identifier, ownId]
  );
  const r = rows[0];
  const at = (value, offset) => (value ? new Date(value).getTime() + offset : 0);
  return Math.max(
    r.account_15m >= 5 ? at(r.account_15m_first, 15 * MINUTE) : 0,
    r.account_24h >= 30 ? at(r.account_last, 24 * HOUR) : r.account_24h >= 15 ? at(r.account_last, HOUR) : 0,
    r.ip_15m >= 20 ? at(r.ip_15m_first, 15 * MINUTE) : 0,
    r.ip_24h >= 60 ? at(r.ip_last, 24 * HOUR) : 0
  );
}

/** Throws 429 while locked; ignores the attempt `ownId` (the one being checked). */
async function assertLoginAllowed(ip, identifier, ownId) {
  const remaining = (await lockedUntil(ip, identifier, ownId)) - Date.now();
  if (remaining > 0) {
    const minutes = Math.ceil(remaining / MINUTE);
    const wait = minutes > 90 ? `${Math.ceil(minutes / 60)} Stunden` : `${minutes} Minuten`;
    const error = new HttpError(429, `Zu viele Fehlversuche. Die Anmeldung ist für ${wait} gesperrt.`);
    error.retryAfter = Math.ceil(remaining / 1000);
    throw error;
  }
}

/**
 * Records a password check as failed, then throws 429 if the limits are
 * reached (the attempt is dropped again then: a blocked request is no
 * guess). Returns the attempt's id: the caller leaves it as a failure,
 * or calls loginSucceeded() / discardLoginAttempt().
 */
export async function startLoginAttempt(ip, identifier) {
  const { rows } = await query('INSERT INTO login_attempts (ip, identifier, success) VALUES ($1, $2, false) RETURNING id', [ip, identifier]);
  const id = rows[0].id;
  try {
    await assertLoginAllowed(ip, identifier, id);
  } catch (error) {
    await discardLoginAttempt(id);
    throw error;
  }
  await query(`DELETE FROM login_attempts WHERE created_at < now() - interval '7 days'`);
  return id;
}

export async function loginSucceeded(id) {
  await query('UPDATE login_attempts SET success = true WHERE id = $1', [id]);
}

/** Forgets an attempt that wasn't a password guess (blocked, bot check failed, step-up passed). */
export async function discardLoginAttempt(id) {
  await query('DELETE FROM login_attempts WHERE id = $1', [id]);
}

/**
 * Accounts and IP addresses locked right now, for the change log
 * ({ type: 'account' | 'ip', value, until }). Login names are never empty
 * (min. 3 characters), so '' checks only the other side.
 */
export async function currentLocks() {
  const { rows } = await query(
    `SELECT 'account' AS type, identifier AS value FROM login_attempts
       WHERE NOT success AND created_at > now() - interval '24 hours' GROUP BY identifier
     UNION ALL
     SELECT 'ip', ip FROM login_attempts
       WHERE NOT success AND created_at > now() - interval '24 hours' GROUP BY ip
     LIMIT 400`
  );
  const locks = [];
  for (const { type, value } of rows) {
    const until = type === 'account' ? await lockedUntil('', value) : await lockedUntil(value, '');
    if (until > Date.now()) locks.push({ type, value, until: new Date(until).toISOString() });
  }
  return locks;
}

/** Lifts a lock: forgets the failed attempts of that account or IP address. */
export async function clearFailedAttempts(type, value) {
  const column = type === 'account' ? 'identifier' : 'ip';
  const { rowCount } = await query(`DELETE FROM login_attempts WHERE NOT success AND ${column} = $1`, [value]);
  return rowCount;
}
