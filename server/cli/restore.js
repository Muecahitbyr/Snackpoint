// npm run db:restore -- <datei.json.gz> --replace
// Replaces ALL data in DATABASE_URL with a backup downloaded from the admin
// panel (Einstellungen → Datensicherung). "-" reads the file from stdin, e.g.
//   railway ssh --service snackpoint-api -- npm run db:restore -- - --replace < backup.json.gz
import { createReadStream } from 'node:fs';
import { readBackup, restoreBackup } from '../lib/backup.js';
import { migrate } from '../db/migrate.js';
import { closePool } from '../db/pool.js';
import { describeTarget } from './util.js';

const [file] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
try {
  if (!file) throw new Error('Verwendung: npm run db:restore -- <backup.json.gz> --replace');
  const data = await readBackup(file === '-' ? process.stdin : createReadStream(file));
  console.log(`Sicherung vom ${new Date(data.createdAt).toLocaleString('de-DE')} (Schema ${data.schema})`);
  if (!process.argv.includes('--replace')) {
    throw new Error(`Das ersetzt ALLE Daten in ${describeTarget()}. Zum Bestätigen --replace anhängen.`);
  }
  await migrate({ log: () => {} });
  await restoreBackup(data);
  console.log('✓ Wiederhergestellt. Alle Admins müssen sich neu anmelden.');
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
