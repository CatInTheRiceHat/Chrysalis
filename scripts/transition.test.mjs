import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('public deployment excludes the prototype build while preserving existing APIs and schedules', async () => {
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  assert.equal(config.outputDirectory, 'public-site/dist');
  assert.equal(config.buildCommand, 'cd public-site && npm run build');
  assert(config.rewrites.some(r => r.source === '/api/:path*' && r.destination === '/api/index.py'));
  assert.deepEqual(config.crons, [
    { path: '/api/cron/drop?mode=morning', schedule: '0 7 * * *' },
    { path: '/api/cron/drop?mode=evening', schedule: '0 19 * * *' },
  ], 'Legacy cron retirement requires a separate decision, even though the routes are stale.');
  const workflow = await readFile('.github/workflows/youtube-feed-ingest.yml', 'utf8');
  assert(workflow.includes('7 0,6,12,18 * * *'));
  const ignores = (await readFile('.vercelignore', 'utf8')).split('\n');
  for (const required of ['api', 'core', 'integrations', 'research_api.py', 'requirements.txt']) assert(!ignores.includes(required));
});
test('public-site runtime does not import extension or legacy application code', async () => {
  const pkg = JSON.parse(await readFile('public-site/package.json', 'utf8'));
  assert.equal(pkg.dependencies, undefined);
  for (const f of ['public-site/src/pages.mjs', 'public-site/src/site.js', 'public-site/scripts/build.mjs']) {
    assert.doesNotMatch(await readFile(f, 'utf8'), /(?:from|import)\s*['"][^'"]*(?:extension|website|core)\//);
  }
});
