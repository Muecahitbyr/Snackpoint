// Login, logout, current session and password change. There is no sign-up:
// the owner's account is created on the command line (npm run admin:create).
import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { burnVerifyTime, hashPassword, passwordProblem, verifyPassword } from '../auth/password.js';
import { discardLoginAttempt, loginSucceeded, startLoginAttempt } from '../auth/rateLimit.js';
import {
  assertSameOrigin, createSession, destroyOtherSessions, destroySession, loadSession, requireAdmin, requireDeveloper,
} from '../auth/session.js';
import { audit } from '../lib/audit.js';
import { HttpError, badRequest } from '../lib/errors.js';
import { clientIp } from '../lib/request.js';
import { parse, readJson } from '../lib/validation.js';
import { config } from '../config.js';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(254),
  password: z.string().min(1).max(200),
  turnstileToken: z.string().max(4096).optional(),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Cloudflare Turnstile: is this login coming from a human browser? */
async function verifyTurnstile(token, ip) {
  if (!config.turnstileSecretKey) return true;
  if (!token) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: config.turnstileSecretKey, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(8000),
    });
    return (await response.json()).success === true;
  } catch {
    return false;
  }
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().max(200),
});

export const auth = new Hono();

auth.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});

// What the login page needs to know before showing the form.
auth.get('/config', (c) => c.json({ turnstileSiteKey: config.turnstileSiteKey || null }));

auth.post('/login', async (c) => {
  const started = Date.now();
  try {
    return await login(c);
  } finally {
    // Same minimum duration for every outcome (see config.loginMinMs).
    await sleep(Math.max(0, config.loginMinMs - (Date.now() - started)));
  }
});

async function login(c) {
  assertSameOrigin(c);
  const { email, password, turnstileToken } = parse(loginSchema, await readJson(c));
  const ip = clientIp(c);
  const attempt = await startLoginAttempt(ip, email);
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    await discardLoginAttempt(attempt);
    throw new HttpError(400, 'Die Sicherheitsprüfung ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.');
  }

  const { rows } = await query('SELECT id, email, display_name, role, password_hash FROM admin_users WHERE lower(email) = $1', [email]);
  const user = rows[0];
  const valid = user ? await verifyPassword(user.password_hash, password) : (await burnVerifyTime(password), false);
  if (!valid) throw new HttpError(401, 'E-Mail oder Passwort ist falsch.');
  await loginSucceeded(attempt);

  const { csrfToken } = await createSession(c, user.id);
  await query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [user.id]);
  c.set('session', { user: { id: user.id } });
  await audit(c, 'login', 'session', '', 'Anmeldung');
  return c.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role }, csrfToken });
}

auth.get('/me', async (c) => {
  const session = await loadSession(c);
  // 200 rather than 401: "not logged in" is an expected answer here.
  if (!session) return c.json({ user: null });
  return c.json({ user: session.user, csrfToken: session.csrfToken });
});

auth.post('/logout', requireAdmin, async (c) => {
  await audit(c, 'logout', 'session', '', 'Abmeldung');
  await destroySession(c);
  return c.json({ ok: true });
});

// Owners can't change their password themselves — the developer sets it.
auth.post('/password', requireAdmin, requireDeveloper, async (c) => {
  const session = c.get('session');
  const { currentPassword, newPassword } = parse(passwordSchema, await readJson(c));
  const { rows } = await query('SELECT password_hash FROM admin_users WHERE id = $1', [session.user.id]);
  const attempt = await startLoginAttempt(clientIp(c), session.user.email);
  if (!(await verifyPassword(rows[0].password_hash, currentPassword))) {
    throw badRequest('Das aktuelle Passwort ist falsch.', { fields: { currentPassword: 'Falsches Passwort' } });
  }
  await discardLoginAttempt(attempt);
  const problem = passwordProblem(newPassword);
  if (problem) throw badRequest(problem, { fields: { newPassword: problem } });
  await query('UPDATE admin_users SET password_hash = $2, password_changed_at = now() WHERE id = $1', [
    session.user.id,
    await hashPassword(newPassword),
  ]);
  // Anyone else still logged in with the old password gets logged out.
  await destroyOtherSessions(session.user.id, session.id);
  await audit(c, 'update', 'password', '', 'Passwort geändert');
  return c.json({ ok: true });
});
