import { mkdir, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pages, layout } from '../src/pages.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('assets', 'dist/assets', { recursive: true });
await cp('src/site.css', 'dist/assets/site.css');
await cp('src/site.js', 'dist/assets/site.js');
const privacy = await readFile('src/privacy.html', 'utf8');
for (const [route, page] of Object.entries(pages(privacy))) {
  const directory = route === '/' ? 'dist' : `dist${route}`;
  await mkdir(directory, { recursive: true });
  await writeFile(`${directory}/index.html`, layout(route, page));
}
await writeFile('dist/404.html', layout('/404', { title: 'Page not found', content: '<section class="reading"><p class="eyebrow">A different direction</p><h1>This page has moved on.</h1><p>Chrysalis now focuses on intentional YouTube use. Explore the extension or read about the original prototype.</p><p><a class="button" href="/">Meet Chrysalis</a> <a href="/legacy">Original project information</a></p></section>' }));
console.log('Built six static pages and a 404 page. No legacy app, API, account or runtime dependency.');
