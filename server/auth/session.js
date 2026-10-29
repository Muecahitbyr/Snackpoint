// Server-side sessions. The browser only holds a random token in an
// HttpOnly + Secure + SameSite=Strict cookie; the database stores its SHA-256
// hash, plus a per-session CSRF token the admin app sends back in a header.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { clientIp } from '../lib/request.js';

// "__Host-" makes the browser refuse the cookie unless it's Secure, has
// Path=/ and no Domain — it can't be planted by a subdomain.
const COOKIE_NAME = config.cookieSecure ? '__Host-sp_admin' : 'sp_admin';
const REFRESH_AFTER_MS = 5 * 60 * 1000;
// A developer viewing the panel as an owner: ends after this at the latest.
const IMPERSONATION_MS = 2 * 3600 * 1000;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const idleMs = () => config.sessionIdleHours * 3600 * 1000;

function writeCookie(c, token, expiresAt) {
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'Strict',
    path: '/',
    expires: expiresAt,
  });
}

/** `impersonatedBy`: the developer who opens this owner session ("Als Inhaber anmelden"). */
export async function createSession(c, userId, { impersonatedBy = null } = {}) {
  const token = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + (impersonatedBy ? Math.min(idleMs(), IMPERSONATION_MS) : idleMs()));
  await query(
    `INSERT INTO admin_sessions (user_id, token_hash, csrf_token, user_agent, ip, expires_at, impersonated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, sha256(token), csrfToken, (c.req.header('user-agent') ?? '').slice(0, 300), clientIp(c), expiresAt, impersonatedBy]
  );
  // Opportunistic cleanup of long-expired sessions.
  await query(`DELETE FROM admin_sessions WHERE expires_at < now() - interval '1 day'`);
  writeCookie(c, token, expiresAt);
  return { csrfToken };
}

/** The current session + user, or null. Slides the idle timeout forward. */
export async function loadSession(c) {
  const token = getCookie(c, COOKIE_NAME);
  if (!token || token.length > 100) return null;
  const { rows } = await query(
    `SELECT s.id, s.csrf_token, s.created_at, s.last_seen_at, u.id AS user_id, u.email, u.display_name, u.role,
            i.id AS impersonator_id, i.email AS impersonator_email, i.display_name AS impersonator_name
       FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id
       LEFT JOIN admin_users i ON i.id = s.impersonated_by
      WHERE s.token_hash = $1 AND s.expires_at > now()
        AND s.created_at > now() - make_interval(days => $2)
        -- "Als Inhaber" only while the developer is still a developer, and for 2 hours at most.
        AND (s.impersonated_by IS NULL OR (i.role = 'developer' AND s.created_at > now() - make_interval(secs => $3)))`,
    [sha256(token), config.sessionMaxDays, IMPERSONATION_MS / 1000]
  );
  const session = rows[0];
  if (!session) return null;

  if (Date.now() - new Date(session.last_seen_at).getTime() > REFRESH_AFTER_MS) {
    const maxEnd = new Date(session.created_at).getTime() + (session.impersonator_id ? IMPERSONATION_MS : config.sessionMaxDays * 86400 * 1000);
    const expiresAt = new Date(Math.min(Date.now() + idleMs(), maxEnd));
    await query('UPDATE admin_sessions SET last_seen_at = now(), expires_at = $2 WHERE id = $1', [session.id, expiresAt]);
    writeCookie(c, token, expiresAt);
  }
  return {
    id: session.id,
    csrfToken: session.csrf_token,
    user: {
      id: session.user_id,
      email: session.email,
      displayName: session.display_name,
      role: session.role,
      impersonatedBy: session.impersonator_id
        ? { id: session.impersonator_id, email: session.impersonator_email, displayName: session.impersonator_name }
        : undefined,
    },
  };
}

/** Replaces the current session with a new one for `userId` (start or end of "Als Inhaber"). */
export async function switchSession(c, userId, options) {
  const token = getCookie(c, COOKIE_NAME);
  if (token) await query('DELETE FROM admin_sessions WHERE token_hash = $1', [sha256(token)]);
  return createSession(c, userId, options);
}

export async function destroySession(c) {
  const token = getCookie(c, COOKIE_NAME);
  if (token) await query('DELETE FROM admin_sessions WHERE token_hash = $1', [sha256(token)]);
  deleteCookie(c, COOKIE_NAME, { path: '/', secure: config.cookieSecure });
}

/** Ends every session of the user except `keepSessionId` (after a password change). */
export async function destroyOtherSessions(userId, keepSessionId) {
  await query('DELETE FROM admin_sessions WHERE user_id = $1 AND id <> $2', [userId, keepSessionId]);
}

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Rejects cross-site requests: the Origin (or Sec-Fetch-Site) must be ours. */
export function assertSameOrigin(c) {
  if (!UNSAFE_METHODS.has(c.req.method)) return;
  const origin = c.req.header('origin');
  if (origin) {
    // Behind the Worker the API runs on another host; the Worker tells us
    // the website's host (only trusted together with the proxy secret).
    const siteHost = c.get('siteHost');
    const siteOrigins = siteHost ? [`https://${siteHost}`, ...(config.isProduction ? [] : [`http://${siteHost}`])] : [];
    const allowed = origin === new URL(c.req.url).origin || siteOrigins.includes(origin) || config.allowedOrigins.includes(origin);
    if (!allowed) throw forbidden('Anfrage von fremder Seite abgelehnt.');
    return;
  }
  const site = c.req.header('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw forbidden('Anfrage von fremder Seite abgelehnt.');
}

/** Middleware (after requireAdmin): only accounts with the developer role. */
export async function requireDeveloper(c, next) {
  if (c.get('session').user.role !== 'developer') {
    throw forbidden('Dieser Bereich ist nur für den Entwickler. Bitte wende dich an ihn.');
  }
  await next();
}

/** Middleware: requires a logged-in admin; unsafe methods also need the CSRF token. */
export async function requireAdmin(c, next) {
  assertSameOrigin(c);
  const session = await loadSession(c);
  if (!session) throw unauthorized();
  if (UNSAFE_METHODS.has(c.req.method)) {
    const sent = Buffer.from(c.req.header('x-csrf-token') ?? '');
    const expected = Buffer.from(session.csrfToken);
    if (sent.length !== expected.length || !timingSafeEqual(sent, expected)) {
      throw forbidden('Sitzung abgelaufen – bitte Seite neu laden.');
    }
  }
  c.set('session', session);
  c.header('Cache-Control', 'no-store');
  await next();
}
