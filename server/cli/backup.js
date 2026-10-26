// npm run db:backup — full dump of DATABASE_URL (incl. all images) into
// backups/ with pg_dump. Restore: pg_restore --clean --no-owner -d <url> <file>
// The connection details go to pg_dump via environment variables, so the
// password never shows up in the process list.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { config } from '../config.js';
import { describeTarget } from './util.js';

const url = new URL(config.databaseUrl);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const file = `backups/snackpoint-${stamp}.dump`;
mkdirSync('backups', { recursive: true });

console.log(`Backup von ${describeTarget()} → ${file}`);
const result = spawnSync('pg_dump', ['--format=custom', '--no-owner', '--no-acl', '--file', file], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: url.pathname.slice(1),
    PGSSLMODE: config.databaseSsl === 'verify' ? 'verify-full' : config.databaseSsl ? 'require' : 'disable',
  },
});
if (result.error) {
  console.error(`pg_dump nicht gefunden (${result.error.message}). Bitte PostgreSQL-Client-Tools installieren.`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
console.log('✓ Backup erstellt.');
