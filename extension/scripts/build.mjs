import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('static', 'dist', { recursive: true });
const common = { bundle: true, target: 'chrome111', minify: true, sourcemap: false, legalComments: 'none', logLevel: 'info' };
await Promise.all([
  build({ ...common, entryPoints: { background: 'src/background.ts', page: 'src/ui/page.ts' }, outdir: 'dist', format: 'esm' }),
  build({ ...common, entryPoints: ['src/content/index.ts'], outfile: 'dist/content.js', format: 'iife' }),
]);
