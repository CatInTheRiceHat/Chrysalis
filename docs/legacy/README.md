# Legacy recovery

Baseline tag: **`legacy-web-baseline-2026-09-07`**.
Revision: **`5228d0df5e983b46e57f4e403450c976a4fc81f0`**.
The working tree was clean when captured. Recent session-interface work was already
committed; unrelated work was not overwritten.

The original relative paths remain intact: `website/` (source/public assets and npm
lockfile), `api.py`, `api/`, `research_api.py`, `core/`, `integrations/`, `scripts/`,
`tests/`, `migrations/`, `supabase_schema.sql`, `requirements.txt`, tracked SQLite/seed
files, algorithm documentation, `intentional_social/` (including pub lockfile/assets),
and `archive/visual-assets/`. These are preserved prototypes, outside the public-site build.

## Backup created

Private local directory:
`/Users/elaine/Documents/Chrysalis-backups/legacy-5228d0df5e98/`

- `repository.bundle`: all local refs/history, checked with `git bundle verify`.
- `lfs-objects/`: local LFS objects. All **149 baseline-referenced files** were
  independently hashed and matched their SHA-256 OIDs.
- `manifest.json`: revision/tag, file paths/OIDs and bundle checksum.

`git lfs fsck --objects HEAD` passed. Default `git lfs fsck` returned a pointer-check
error; the object-only check and independent baseline hashes passed. Older historical
objects not referenced by this baseline were not separately audited. This is a local
backup, not an off-device disaster backup; nothing was uploaded.

## Restore into an isolated checkout

```sh
git clone /path/to/backup/repository.bundle Chrysalis-restored
cd Chrysalis-restored
mkdir -p .git/lfs/objects
cp -R /path/to/backup/lfs-objects/. .git/lfs/objects/
git checkout legacy-web-baseline-2026-09-07
git lfs checkout
git lfs fsck --objects HEAD
```

An isolated clone from the bundle was checked out and all 149 LFS files were hydrated
and independently hashed successfully. Representative source, lockfiles and migrations
were also verified present; no application or production database was started.

Use the baseline README and lockfiles to rebuild locally before reconnecting services.
The baseline Vercel file preserves the previous build, rewrites and crons; platform
overrides need a separate inventory. Restoring the website need not downgrade the extension.

## Separate data recovery

No production PostgreSQL/Supabase records, auth users/configuration, avatar bucket,
secrets, DNS or participant state were accessed or backed up. Ignored datasets and
environment files are not in the bundle. Local SQLite is not a production schema dump:
it contains legacy tables and the browser's `diagnostics` table lacks a corresponding
creation migration here. Do not treat migrations alone as a complete restore procedure.

Website-local saved/liked videos/reflections, Flutter preferences and extension history
are separate device data. No import or migration between products is provided.
The old instructions reference `../archive/2026-07-03-unused-code/`; that directory
was absent during inspection, so its contents are not claimed as preserved.
