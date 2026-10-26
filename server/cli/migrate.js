// npm run db:migrate — applies pending migrations to DATABASE_URL.
import { migrate } from '../db/migrate.js';
import { closePool } from '../db/pool.js';
import { describeTarget } from './util.js';

console.log(`Migrationen für ${describeTarget()}`);
try {
  await migrate();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await closePool();
}
