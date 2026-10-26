// npm run db:app-role < password-file
// Sets the login password of the restricted "snackpoint_app" role (see
// migration 004) from stdin, so it never shows up in the shell history or
// process list. Run once with the owner connection, then point the API's
// DATABASE_URL at snackpoint_app (see ADMIN.md).
import './owner-connection.js';
import { migrate } from '../db/migrate.js';
import { closePool, query } from '../db/pool.js';
import { describeTarget } from './util.js';

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const password = Buffer.concat(chunks).toString('utf8').trim();

try {
  // Restricted alphabet: the password ends up inside SQL (ALTER ROLE can't
  // take parameters), so only characters that need no quoting are accepted.
  if (!/^[A-Za-z0-9]{32,128}$/.test(password)) throw new Error('Passwort per stdin übergeben: 32–128 Zeichen, nur A–Z, a–z, 0–9.');
  console.log(`Datenbank: ${describeTarget()}`);
  await migrate({ log: () => {} });
  await query(`ALTER ROLE snackpoint_app WITH LOGIN PASSWORD '${password}'`);
  console.log('✓ Rolle snackpoint_app kann sich jetzt anmelden (nur Lesen/Schreiben von Daten).');
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
