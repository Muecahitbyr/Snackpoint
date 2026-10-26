// Owner account management on the command line — the only way to create an
// admin (there is no sign-up page) and the secure way to reset a forgotten
// password: whoever can run this already has access to the database.
//
//   npm run admin:create           create the owner account
//   npm run admin:reset-password   set a new password (logs out all sessions)
//
// Without a terminal (e.g. CI), the values can come from ADMIN_EMAIL and
// ADMIN_PASSWORD instead; don't leave those set afterwards.
import { hashPassword, passwordProblem } from '../auth/password.js';
import { migrate } from '../db/migrate.js';
import { closePool, query } from '../db/pool.js';
import { describeTarget, prompt } from './util.js';

const command = process.argv[2];

async function askEmail() {
  const email = (process.env.ADMIN_EMAIL ?? (await prompt('E-Mail-Adresse: '))).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Ungültige E-Mail-Adresse.');
  return email;
}

async function askPassword(email) {
  if (process.env.ADMIN_PASSWORD) {
    const problem = passwordProblem(process.env.ADMIN_PASSWORD, { email });
    if (problem) throw new Error(problem);
    return process.env.ADMIN_PASSWORD;
  }
  for (;;) {
    const password = await prompt('Passwort (mind. 12 Zeichen, wird nicht angezeigt): ', { hidden: true });
    const problem = passwordProblem(password, { email });
    if (problem) {
      console.log(`  ✗ ${problem}`);
      continue;
    }
    if ((await prompt('Passwort wiederholen: ', { hidden: true })) !== password) {
      console.log('  ✗ Die Passwörter stimmen nicht überein.');
      continue;
    }
    return password;
  }
}

async function create() {
  const email = await askEmail();
  const { rows } = await query('SELECT count(*)::int AS n FROM admin_users');
  if (rows[0].n > 0 && !process.argv.includes('--additional')) {
    throw new Error('Es gibt bereits ein Admin-Konto. Passwort vergessen? → npm run admin:reset-password');
  }
  const password = await askPassword(email);
  await query('INSERT INTO admin_users (email, display_name, password_hash) VALUES ($1, $2, $3)', [
    email, 'Entwickler', await hashPassword(password),
  ]);
  console.log(`✓ Admin-Konto ${email} angelegt. Anmeldung unter /admin`);
}

async function resetPassword() {
  const email = await askEmail();
  const { rows } = await query('SELECT id FROM admin_users WHERE lower(email) = $1', [email]);
  if (!rows[0]) throw new Error('Kein Admin-Konto mit dieser E-Mail-Adresse.');
  const password = await askPassword(email);
  await query('UPDATE admin_users SET password_hash = $2, password_changed_at = now() WHERE id = $1', [rows[0].id, await hashPassword(password)]);
  await query('DELETE FROM admin_sessions WHERE user_id = $1', [rows[0].id]);
  await query('DELETE FROM login_attempts WHERE identifier = $1', [email]);
  await query(`INSERT INTO audit_log (admin_user_id, action, entity_type, summary) VALUES ($1, 'update', 'password', 'Passwort per Kommandozeile zurückgesetzt')`, [rows[0].id]);
  console.log('✓ Passwort geändert. Alle bestehenden Sitzungen wurden abgemeldet.');
}

try {
  console.log(`Datenbank: ${describeTarget()}`);
  await migrate({ log: () => {} });
  if (command === 'create') await create();
  else if (command === 'reset-password') await resetPassword();
  else throw new Error('Verwendung: node server/cli/admin.js create|reset-password');
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
