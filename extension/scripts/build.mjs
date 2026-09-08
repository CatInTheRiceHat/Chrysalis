import { build } from 'esbuild';
import { cp, mkdir, rm, readFile } from 'node:fs/promises';
import path from 'node:path';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
const files = JSON.parse(await readFile('scripts/package-files.json', 'utf8'));
for (const file of files.filter(file => !file.endsWith('.js'))) {
  await mkdir(path.dirname(`dist/${file}`), { recursive: true });
  await cp(`static/${file}`, `dist/${file}`, { dereference: false });
}
const common = { bundle: true, target: 'chrome111', minify: true, sourcemap: false, legalComments: 'none', logLevel: 'info' };
await Promise.all([
  build({ ...common, entryPoints: { background: 'src/background.ts', page: 'src/ui/page.ts' }, outdir: 'dist', format: 'esm' }),
  build({ ...common, entryPoints: ['src/content/index.ts'], outfile: 'dist/content.js', format: 'iife' }),
]);
