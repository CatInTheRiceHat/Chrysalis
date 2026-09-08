# Extension and public-site transition — 0.8.0

## Preserved baseline

Started from clean revision `5228d0df5e983b46e57f4e403450c976a4fc81f0`.
Created local tag `legacy-web-baseline-2026-09-07`, a verified Git bundle and a copy
of LFS objects; 149 baseline-referenced objects matched their SHA-256 identities.
See `legacy/README.md` for backup location, restoration and exclusions. Original
source paths, lockfiles, migrations, assets and history remain intact.

## Changes

- Retained the existing centered YouTube introduction and side timer. Fixed an early-focus
  race that could consume the once-per-visit introduction before initial display state
  arrived; a browser regression delays state replies and controls the delivery order of a browser-generated focus event. Added explicit
  in-page intention disclosure and regression coverage for default modal dismissal,
  host interaction, no unrequested session, and populated schema-6-to-7 preservation.
- Reconciled release 0.8.0/schema 7, install/privacy/store materials. One privacy source
  generates checked-in offline/public copies; both product builds remain independent.
- Included integrated session coverage in package acceptance; added revision/source
  hash binding, privacy-version/runtime-network/credential guards. Test screenshots no
  longer overwrite historical evidence by default.
- Added the independent public site, responsive light/dark design, keyboard navigation,
  meaningful 404/legacy notices, accurate install/privacy and verified Issues destination.
- Root deployment now targets the public site. Existing API routing, Vercel crons and
  ingestion workflow are preserved. Service retirement is an unapplied separate patch.
- Added CI with LFS checkout, extension/package/browser checks and independent site tests.

## Verification record

Final release acceptance and live-site results are recorded below after execution.
Machine-readable package evidence remains under `extension/release/`; test evidence
under each product's ignored `test-results/`. No participant data was used.

## Boundaries

No public deployment, push, Store submission, service shutdown, auth change, production
DB access, ingestion or data deletion. Vercel routing still needs platform-preview QA.
The site artifact is independent; replacing old study/account UI on production remains
conditional on consumer checks. Database/auth/avatar/research retention is separate.
See `../deployment/README.md` for exact URL behavior, the unapplied patch and rollback.
