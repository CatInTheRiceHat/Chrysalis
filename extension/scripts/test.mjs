import { build } from 'esbuild';
import { readdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

await rm('.test-build', { recursive: true, force: true });
const tests = (await readdir('tests')).filter(file => file.endsWith('.test.ts'));
await build({ entryPoints: tests.map(file => `tests/${file}`), outdir: '.test-build', bundle: true, platform: 'node', format: 'esm', packages: 'external' });
const result = spawnSync(process.execPath, ['--test', ...tests.map(file => `.test-build/${file.replace('.ts', '.js')}`)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
