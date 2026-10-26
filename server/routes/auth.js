// Login, logout, current session and password change. There is no sign-up:
// the owner's account is created on the command line (npm run admin:create).
import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { burnVerifyTime, hashPassword, passwordProblem, verifyPassword } from '../auth/password.js';
import { assertLoginAllowed, recordLoginAttempt } from '../auth/rateLimit.js';
import {
  assertSameOrigin, createSession, destroyOtherSessions, destroySession, loadSession, requireAdmin, requireDeveloper,
} from '../auth/session.js';
import { audit } from '../lib/audit.js';
import { HttpError, badRequest } from '../lib/errors.js';
import { clientIp } from '../lib/request.js';
import { parse, readJson } from '../lib/validation.js';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(3).max(254),
  password: z.string().min(1).max(200),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().max(200),
});

export const auth = new Hono();

auth.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});

auth.post('/login', async (c) => {
  assertSameOrigin(c);
  const { email, password } = parse(loginSchema, await readJson(c));
  const ip = clientIp(c);
  await assertLoginAllowed(ip, email);

  const { rows } = await query('SELECT id, email, display_name, role, password_hash FROM admin_users WHERE lower(email) = $1', [email]);
  const user = rows[0];
  const valid = user ? await verifyPassword(user.password_hash, password) : (await burnVerifyTime(password), false);
  await recordLoginAttempt(ip, email, valid);
  if (!valid) throw new HttpError(401, 'E-Mail oder Passwort ist falsch.');

  const { csrfToken } = await createSession(c, user.id);
  await query('UPDATE admin_users SET last_login_at = now() WHERE id = $1', [user.id]);
  c.set('session', { user: { id: user.id } });
  await audit(c, 'login', 'session', '', 'Anmeldung');
  return c.json({ user: { id: user.id, email: user.email, displayName: user.display_name, role: user.role }, csrfToken });
});

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
  const ip = clientIp(c);
  await assertLoginAllowed(ip, session.user.email);
  if (!(await verifyPassword(rows[0].password_hash, currentPassword))) {
    await recordLoginAttempt(ip, session.user.email, false);
    throw badRequest('Das aktuelle Passwort ist falsch.', { fields: { currentPassword: 'Falsches Passwort' } });
  }
  const problem = passwordProblem(newPassword, { email: session.user.email });
  if (problem) throw badRequest(problem, { fields: { newPassword: problem } });
  if (newPassword === currentPassword) {
    throw badRequest('Das neue Passwort muss sich vom alten unterscheiden.', { fields: { newPassword: 'Gleich wie bisher' } });
  }
  await query('UPDATE admin_users SET password_hash = $2, password_changed_at = now() WHERE id = $1', [
    session.user.id,
    await hashPassword(newPassword),
  ]);
  // Anyone else still logged in with the old password gets logged out.
  await destroyOtherSessions(session.user.id, session.id);
  await audit(c, 'update', 'password', '', 'Passwort geändert');
  return c.json({ ok: true });
});
