// Admin accounts (developer only). Role "developer" sees everything, role
// "owner" only the daily business (see app.js). There is still no public
// sign-up. Creating, deleting and resetting another account's password all
// require the acting admin to confirm with their own password.
import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { hashPassword, passwordProblem, verifyPassword } from '../auth/password.js';
import { assertLoginAllowed, recordLoginAttempt } from '../auth/rateLimit.js';
import { audit } from '../lib/audit.js';
import { badRequest, conflict, mapDbError, notFound } from '../lib/errors.js';
import { clientIp } from '../lib/request.js';
import { parse, parseId, readJson, text } from '../lib/validation.js';

const email = z.string().trim().toLowerCase().email('Ungültige E-Mail-Adresse').max(254);
const currentPassword = z.string().min(1, 'Bitte dein Passwort eingeben').max(200);
const role = z.enum(['developer', 'owner']);

const iso = (value) => (value ? new Date(value).toISOString() : null);
const userJson = (row, selfId) => ({
  id: row.id,
  email: row.email,
  displayName: row.display_name,
  role: row.role,
  lastLoginAt: iso(row.last_login_at),
  createdAt: iso(row.created_at),
  isSelf: row.id === selfId,
});

/** Step-up check: the acting admin re-enters their password (rate limited like the login). */
async function confirmActor(c, password) {
  const { user } = c.get('session');
  const ip = clientIp(c);
  await assertLoginAllowed(ip, user.email);
  const { rows } = await query('SELECT password_hash FROM admin_users WHERE id = $1', [user.id]);
  if (!(await verifyPassword(rows[0].password_hash, password))) {
    await recordLoginAttempt(ip, user.email, false);
    throw badRequest('Dein Passwort ist falsch.', { fields: { currentPassword: 'Falsches Passwort' } });
  }
}

function assertStrong(password, address) {
  const problem = passwordProblem(password, { email: address });
  if (problem) throw badRequest(problem, { fields: { password: problem } });
}

export const users = new Hono();

users.get('/', async (c) => {
  const { rows } = await query('SELECT * FROM admin_users ORDER BY created_at');
  return c.json({ items: rows.map((row) => userJson(row, c.get('session').user.id)) });
});

users.post('/', async (c) => {
  const data = parse(
    z.object({ email, displayName: text(80).optional(), role: role.default('owner'), password: z.string().max(200), currentPassword }),
    await readJson(c)
  );
  assertStrong(data.password, data.email);
  await confirmActor(c, data.currentPassword);
  let row;
  try {
    ({ rows: [row] } = await query(
      'INSERT INTO admin_users (email, display_name, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING *',
      [data.email, data.displayName ?? '', data.role, await hashPassword(data.password)]
    ));
  } catch (error) {
    if (error.code === '23505') throw conflict('Für diese E-Mail-Adresse gibt es schon ein Konto.');
    throw mapDbError(error);
  }
  await audit(c, 'create', 'admin_user', row.id, row.email);
  return c.json({ item: userJson(row, c.get('session').user.id) }, 201);
});

users.patch('/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  const data = parse(z.object({ displayName: text(80).optional(), email: email.optional(), role: role.optional() }), await readJson(c));
  // Changing the own role could lock the last developer out.
  if (data.role && id === c.get('session').user.id) throw badRequest('Deine eigene Rolle kannst du nicht ändern.');
  let row;
  try {
    ({ rows: [row] } = await query(
      `UPDATE admin_users SET display_name = coalesce($2, display_name), email = coalesce($3, email), role = coalesce($4, role)
        WHERE id = $1 RETURNING *`,
      [id, data.displayName ?? null, data.email ?? null, data.role ?? null]
    ));
  } catch (error) {
    if (error.code === '23505') throw conflict('Für diese E-Mail-Adresse gibt es schon ein Konto.');
    throw mapDbError(error);
  }
  if (!row) throw notFound();
  await audit(c, 'update', 'admin_user', id, row.email);
  return c.json({ item: userJson(row, c.get('session').user.id) });
});

// New password for another account; that account is logged out everywhere.
users.post('/:id/password', async (c) => {
  const id = parseId(c.req.param('id'));
  const data = parse(z.object({ password: z.string().max(200), currentPassword }), await readJson(c));
  const { rows } = await query('SELECT email FROM admin_users WHERE id = $1', [id]);
  if (!rows[0]) throw notFound();
  if (id === c.get('session').user.id) throw badRequest('Dein eigenes Passwort änderst du unter „Passwort ändern“.');
  assertStrong(data.password, rows[0].email);
  await confirmActor(c, data.currentPassword);
  await query('UPDATE admin_users SET password_hash = $2, password_changed_at = now() WHERE id = $1', [id, await hashPassword(data.password)]);
  await query('DELETE FROM admin_sessions WHERE user_id = $1', [id]);
  await audit(c, 'update', 'password', id, `Passwort gesetzt für ${rows[0].email}`);
  return c.json({ ok: true });
});

users.delete('/:id', async (c) => {
  const id = parseId(c.req.param('id'));
  const data = parse(z.object({ currentPassword }), await readJson(c));
  if (id === c.get('session').user.id) throw badRequest('Du kannst dein eigenes Konto nicht löschen.');
  const { rows } = await query('SELECT email FROM admin_users WHERE id = $1', [id]);
  if (!rows[0]) throw notFound();
  await confirmActor(c, data.currentPassword);
  await query('DELETE FROM admin_users WHERE id = $1', [id]);
  await audit(c, 'delete', 'admin_user', id, rows[0].email);
  return c.json({ ok: true });
});
