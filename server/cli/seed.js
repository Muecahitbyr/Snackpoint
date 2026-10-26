// npm run db:seed — moves the original website content into an empty
// database. Never overwrites existing data.
import { migrate } from '../db/migrate.js';
import { seed } from '../db/seed.js';
import { closePool } from '../db/pool.js';
import { describeTarget } from './util.js';

console.log(`Inhalte übernehmen in ${describeTarget()}`);
try {
  await migrate({ log: () => {} });
  await seed();
  console.log('Fertig.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
