// Cloudflare Turnstile bot check on the admin login.
//
// Active only when BOTH keys are set: the site key makes the login form show
// the widget, the secret key lets this server verify its token. With just one
// of them a half-switched-on check could lock everybody out (no widget, but
// tokens required), so an incomplete setup counts as "off" and is reported
// once at startup.
//
// Tokens are verified with Cloudflare's Siteverify API, which rejects missing,
// invalid, expired and already used tokens. On top, the token must have been
// issued on one of TURNSTILE_HOSTNAMES. Logs carry only the reason, Cloudflare's
// error codes and a rejected host name — never the secret, the token, the IP or
// the email.
import { config } from '../config.js';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TIMEOUT_MS = 8000;
// Error codes Cloudflare documents; anything else is logged as "other".
const KNOWN_ERROR_CODES = new Set([
  'missing-input-secret', 'invalid-input-secret', 'missing-input-response', 'invalid-input-response',
  'bad-request', 'timeout-or-duplicate', 'internal-error',
]);
// The same failure is logged at most once a minute; repeats are counted.
const LOG_INTERVAL_MS = 60_000;

/** 'active' (both keys), 'incomplete' (only one) or 'off' (none). */
export function turnstileState() {
  const hasSiteKey = Boolean(config.turnstileSiteKey);
  const hasSecretKey = Boolean(config.turnstileSecretKey);
  if (hasSiteKey && hasSecretKey) return 'active';
  return hasSiteKey || hasSecretKey ? 'incomplete' : 'off';
}

/** What the login form gets: the site key only while the check is active. */
export const turnstileSiteKeyForLogin = () => (turnstileState() === 'active' ? config.turnstileSiteKey : null);

/** One line at startup, so an incomplete setup doesn't go unnoticed. */
export function reportTurnstileConfig(log = console) {
  const state = turnstileState();
  if (state === 'active') {
    log.log(`[turnstile] Aktiv für den Admin-Login (erlaubte Hosts: ${config.turnstileHostnames.join(', ') || 'keine'}).`);
  } else if (state === 'incomplete') {
    const missing = config.turnstileSiteKey ? 'TURNSTILE_SECRET_KEY' : 'TURNSTILE_SITE_KEY';
    log.warn(`[turnstile] Unvollständig konfiguriert (${missing} fehlt): Prüfung bleibt AUS, Login funktioniert ohne Turnstile.`);
  }
}

const lastLog = new Map(); // reason → { at, suppressed }

function logFailure(reason, detail = '') {
  const now = Date.now();
  const entry = lastLog.get(reason);
  if (entry && now - entry.at < LOG_INTERVAL_MS) {
    entry.suppressed += 1;
    return;
  }
  const repeats = entry?.suppressed ? ` (+${entry.suppressed} gleiche seit der letzten Meldung)` : '';
  console.warn(`[turnstile] Login-Prüfung fehlgeschlagen: ${reason}${detail ? ` [${detail}]` : ''}${repeats}`);
  lastLog.set(reason, { at: now, suppressed: 0 });
}

const safeCodes = (codes) =>
  (Array.isArray(codes) ? codes : []).map((code) => (KNOWN_ERROR_CODES.has(code) ? code : 'other')).join(',');

/**
 * Checks a login's Turnstile token.
 * → { ok: true } or { ok: false, reason: 'missing-token' | 'rejected' | 'hostname' | 'unreachable' }
 */
export async function verifyTurnstile(token, ip) {
  if (turnstileState() !== 'active') return { ok: true };
  if (!token) {
    logFailure('missing-token');
    return { ok: false, reason: 'missing-token' };
  }

  let result;
  try {
    const body = new URLSearchParams({ secret: config.turnstileSecretKey, response: token });
    if (ip && ip !== 'unknown') body.set('remoteip', ip);
    const response = await fetch(SITEVERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    result = await response.json();
  } catch (error) {
    logFailure('unreachable', error?.name === 'TimeoutError' ? 'timeout' : 'network');
    return { ok: false, reason: 'unreachable' };
  }

  if (result?.success !== true) {
    logFailure('rejected', safeCodes(result?.['error-codes']));
    return { ok: false, reason: 'rejected' };
  }
  const hostname = String(result.hostname ?? '').toLowerCase();
  if (!config.turnstileHostnames.includes(hostname)) {
    // A host name isn't personal data; it shows which entry is missing.
    logFailure('hostname', /^[a-z0-9.-]{1,253}$/.test(hostname) ? hostname : 'ungültig');
    return { ok: false, reason: 'hostname' };
  }
  return { ok: true };
}
