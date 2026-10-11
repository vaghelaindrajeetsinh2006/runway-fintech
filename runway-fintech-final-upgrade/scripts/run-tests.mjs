import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localTsc = resolve(root, 'node_modules/typescript/bin/tsc');
const testConfig = resolve(root, 'tsconfig.test.json');
const buildDir = resolve(root, '.test-build');
const tscCommand = existsSync(localTsc) ? process.execPath : 'tsc';
const tscArgs = existsSync(localTsc) ? [localTsc, '-p', testConfig] : ['-p', testConfig];

rmSync(buildDir, { recursive: true, force: true });
const compile = spawnSync(tscCommand, tscArgs, { cwd: root, stdio: 'inherit' });
if (compile.status !== 0) {
  rmSync(buildDir, { recursive: true, force: true });
  process.exit(compile.status ?? 1);
}

// The application package is ESM; the isolated compiled test build is CommonJS.
writeFileSync(resolve(buildDir, 'package.json'), '{\"type\":\"commonjs\"}\n');
const tests = spawnSync(process.execPath, ['--test', resolve(root, 'tests/finance.test.cjs')], {
  cwd: root,
  stdio: 'inherit',
});
rmSync(buildDir, { recursive: true, force: true });
process.exit(tests.status ?? 1);
