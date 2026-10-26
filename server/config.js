// Runtime configuration from environment variables (see .env.example).
// Locally they're read from .env; on Railway they come from the service's
// variables. Nothing secret is ever hard-coded here.
import { existsSync } from 'node:fs';

if (existsSync('.env')) process.loadEnvFile('.env');

const env = process.env;
const isProduction = env.NODE_ENV === 'production';

function bool(value, fallback) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

/** false | 'verify' | 'no-verify' — TLS to the database. */
function databaseSsl(value, url) {
  if (value === 'no-verify') return 'no-verify';
  if (value === undefined || value === '') {
    // Localhost and Railway's private network don't need TLS.
    return /@(localhost|127\.0\.0\.1|[^/@]*\.railway\.internal)[:/]/.test(url) ? false : 'verify';
  }
  return bool(value, true) ? 'verify' : false;
}

export const config = {
  isProduction,
  databaseUrl: env.DATABASE_URL ?? '',
  databaseSsl: databaseSsl(env.DATABASE_SSL, env.DATABASE_URL ?? ''),
  // Secure cookies need HTTPS; only switch off for plain-http local dev.
  cookieSecure: bool(env.COOKIE_SECURE, isProduction),
  // Shared secret between the Cloudflare Worker (worker/index.js) and this
  // API. When set, every request without it is refused, so the API is only
  // reachable through the website's own domain.
  proxySecret: env.PROXY_SECRET ?? '',
  // Without the Worker in front: read the client IP from X-Forwarded-For.
  trustProxy: bool(env.TRUST_PROXY, false),
  maxUploadBytes: Math.round(Number(env.MAX_UPLOAD_MB || 10) * 1024 * 1024),
  sessionIdleHours: Number(env.SESSION_IDLE_HOURS || 24),
  sessionMaxDays: Number(env.SESSION_MAX_DAYS || 7),
  // Every login answer takes at least this long (success or not), so timing
  // reveals nothing and password guessing is slowed down.
  loginMinMs: Number(env.LOGIN_MIN_MS ?? 800),
  // Optional Cloudflare Turnstile bot check on the login (both keys needed).
  turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? '',
  turnstileSecretKey: env.TURNSTILE_SECRET_KEY ?? '',
  // Extra origins allowed to call the admin API, comma separated (the
  // site's own origin is always allowed).
  allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
};
