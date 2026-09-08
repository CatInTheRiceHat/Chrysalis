// Assemble reviewed assets from the immutable verified release, without rebuilding it.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const stem = `release/chrysalis-${version}`;
const out = `${stem}-store-preparation`;
const hash = b => createHash('sha256').update(b).digest('hex');
const zip = await readFile(`${stem}.zip`);
const expected = JSON.parse(await readFile(`${stem}-build-manifest.json`, 'utf8')).sha256;
assert.equal(hash(await readFile('release/chrysalis-0.8.0.zip')), 'a618767617e8ca50a66be7e19e89b2f218a4d24aef2011e23355aa18f38c28d9', 'Preserve 0.8.0');
assert.equal(hash(await readFile('release/chrysalis-0.9.0.zip')), '781a8fd16c7dec02710aafd17115cd63bfb3aad1a2ec1447457efb98c65980f2', 'Preserve 0.9.0');
assert.equal(hash(await readFile('release/chrysalis-0.9.1.zip')), 'a0e274468da4dc46ee33d67accdc8f9cf660a85277cfbdf3f79867651da34765', 'Preserve 0.9.1');
assert.equal(hash(zip), expected, 'Upload ZIP must match its verified build manifest');
const validation = JSON.parse(await readFile(`${stem}-validation.json`, 'utf8'));
assert.equal(validation.zipSha256, expected);
assert.equal(validation.passedSuites.length, 12);
assert.equal(validation.sourceDirty, false);
const capture = JSON.parse(await readFile(`${stem}-screenshots/capture-report.json`, 'utf8'));
assert.equal(capture.zipSha256, expected);
const inventory = { version, zipSha256: expected, sourceRevision: capture.sourceRevision, storageDecision: 'Implemented optional encrypted history and temporary activity; publisher review remains', files: [] };
await mkdir(`${out}/screenshots`, { recursive: true });
async function copy(source, target, dimensions, digest) {
  const bytes = await readFile(source);
  if (digest) assert.equal(hash(bytes), digest, source);
  if (dimensions) {
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.deepEqual([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], dimensions, source);
    assert.equal(bytes[24], 8, '8-bit PNG channels');
    assert([2, 6].includes(bytes[25]), 'RGB or RGBA PNG');
  }
  await copyFile(source, `${out}/${target}`);
  inventory.files.push({ file: target, sha256: hash(bytes), ...(dimensions ? { dimensions } : {}) });
}
await copy(`${stem}.zip`, `chrysalis-${version}.zip`, null, expected);
await copy(`${stem}.sha256`, `chrysalis-${version}.sha256`);
await copy(`${stem}-build-manifest.json`, 'build-manifest.json');
await copy(`${stem}-validation.json`, 'validation.json');
await copy(`${stem}-screenshots/capture-report.json`, 'capture-report.json');
const candidates = capture.captures.filter(c => c.storeCandidate);
assert.equal(candidates.length, 5);
for (const c of candidates) await copy(`${stem}-screenshots/${c.file}`, `screenshots/${c.file}`, [1280, 800], c.sha256);
await copy('static/icons/icon-128.png', 'icon-128.png', [128, 128]);
await copy('distribution/artwork/promo-440x280.png', 'promo-440x280.png', [440, 280]);
await copy('distribution/STORE_DRAFT.md', 'STORE_DRAFT.md');
await copy('distribution/STORE_IDENTITY.md', 'STORE_IDENTITY.md');
await copy('distribution/PUBLISHER_CHECKLIST.md', 'PUBLISHER_CHECKLIST.md');
await copy('../docs/encrypted-history-storage.md', 'STORAGE_DECISION.md');
await copy('PRIVACY.md', 'PRIVACY.md');
const draft = await readFile('distribution/STORE_DRAFT.md', 'utf8');
const listing = draft.split('## Proposed listing copy\n\n')[1].split('\n## Developer Dashboard')[0];
await writeFile(`${out}/LISTING.md`, listing);
inventory.files.push({ file: 'LISTING.md', sha256: hash(listing) });
const disclosures = '# Prepared Chrome Web Store privacy answers\n\n' + draft.split('## Developer Dashboard draft fields\n\n')[1].split('\n## Assets and reviewer instructions')[0];
await writeFile(`${out}/DISCLOSURES.md`, disclosures);
inventory.files.push({ file: 'DISCLOSURES.md', sha256: hash(disclosures) });
await writeFile(`${out}/inventory.json`, JSON.stringify(inventory, null, 2) + '\n');
await writeFile(`${out}/README.md`, `# Chrysalis ${version} publisher review kit\n\nThe published privacy page currently describes 0.9.0; this kit includes the synchronized ${version} policy source with unchanged storage design. The updated site source has not been deployed by this preparation. Complete publisher setup and certifications before any later submission; see PUBLISHER_CHECKLIST.md.\nUpload only chrysalis-${version}.zip as the extension, never this whole folder.\nIts SHA-256 is ${expected}.\n\nFive screenshots are actual release UI from a disposable signed-out profile;\nno participant data. Intro, viewing settings, checkpoint, encrypted history and locked history.\nHome was empty while signed out: these do not demonstrate a populated feed.\nThe icon is 128px PNG; small promotional artwork is 440x280; screenshots are\n1280x800 RGB/RGBA PNG, full bleed. The optional 1400x560 marquee is not required\nand is not supplied. Current specifications: https://developer.chrome.com/docs/webstore/images\n\nPrivacy: https://chrysalis-extension-pages.vercel.app/privacy\nSupport: https://chrysalis-extension-pages.vercel.app/contact\nIssues: https://github.com/CatInTheRiceHat/Chrysalis/issues\nBoth destinations are verified anonymously over HTTPS and hosted in a separate static Vercel project. Keep these stable URLs public; the original application and protected preview are independent.\nNo Store item, publisher verification, email delivery or Google approval is claimed.\nThe copied documents retain repository-relative links; use their named kit files here.\n`);
console.log(`Prepared ${out}; preserved ZIP ${expected}; five verified release screenshots.`);
