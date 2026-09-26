// Runs tests/*.test.ts without installing a test framework: bundles them with
// esbuild (already installed as part of Vite) and runs them with Node's
// built-in test runner.  Usage: npm test
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const esbuild = join(root, 'node_modules', '.bin', 'esbuild');
const files = readdirSync(join(root, 'tests')).filter((name) => name.endsWith('.test.ts'));
let failed = false;

for (const file of files) {
  const out = join(tmpdir(), `snackpoint-${process.pid}-${file}.mjs`);
  const build = spawnSync(esbuild, [join(root, 'tests', file), '--bundle', '--platform=node', '--format=esm', `--outfile=${out}`, '--log-level=error'], {
    stdio: 'inherit',
  });
  if (build.status !== 0) process.exit(build.status ?? 1);
  const run = spawnSync(process.execPath, ['--test', '--test-reporter=spec', out], { stdio: 'inherit' });
  if (run.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
