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

Verified implementation revision: `74740a3e609df82479b9a58d1a7e5f7a68abfbcc`
(clean source when packaged). Later documentation-only commits do not change its inputs.
Release: `extension/release/chrysalis-0.8.0.zip`, 17 runtime files, schema 7.
ZIP SHA-256: `a618767617e8ca50a66be7e19e89b2f218a4d24aef2011e23355aa18f38c28d9`.
Source-tree SHA-256: `611f43be8028d1b211f66c06c72d0e222fd1f500d353c181211d8280bd80c642`.

Checks ran September 7, 2026 PDT (some reports use September 8 UTC), using Chromium
153.0.8010.12 in disposable profiles. No participant records or existing user profiles
were used. Machine-readable evidence is retained in `releases/0.8.0/`; generated ZIP,
screenshots and detailed test artifacts remain in each product's ignored output folders.

- **Unit/build:** all 71 tests, strict TypeScript and production build passed. Valid
  populated schema-6 history/reflections/preferences migrate to schema 7 without reset;
  future schema 8 is rejected without rewriting it. This does not establish safe downgrade.
- **Packaged acceptance:** all ten browser suites passed against the extracted ZIP:
  integrated, browser, session, viewing, experience, checkpoints, history, hardening,
  usability and native popup. Two clean builds produced identical ZIP bytes; all 17
  extracted/runtime files match the manifest. Missing-script, unexpected-file and
  credential-signature negative guards passed. The real API-opened Chrome action popup
  was exercised using trusted browser input; physical toolbar placement remains manual.
- **Regression:** the default introduction is exercised and dismissed through real UI
  before host-page actions. The early-focus test deliberately delays display replies and
  delivers a browser-generated focusin event to the registered window-focus callback. Fixed code
  passes; restoring the pre-fix content entry point fails the specific claim-before-display
  assertion. This is controlled ordering/fault injection, not a naturally occurring focus race.
- **Public site:** two Node build tests and the browser suite passed at 375/760/1440px,
  including keyboard/menu focus, theme persistence, local links, contact targets, 404 and
  zero external page requests. A separate copy with no sibling apps or node_modules built
  successfully using Node alone. Desktop/mobile light and dark screenshots were inspected.
- **Privacy/deployment guards:** synchronized policy copies, two transition tests,
  retirement-patch dry check and Git whitespace check passed. No API/ingestion was run.
- **Live viewing:** signed-out YouTube guide/Shorts and watch recommendations hide and
  restore; actual video time advances with recommendations hidden; player/caption controls,
  search SPA navigation and subscriptions remain available. Populated Home remains fixture
  coverage because live signed-out Home returned an empty-feed prompt.
- **Live sessions:** the final extracted ZIP passed `integrated-browser.mjs --live` on
  signed-out YouTube: centered intro/focus/Escape, refresh suppression, cross-tab session
  identity, hiding/restoring the running timer, pause/resume, target choices, breaks,
  finish, optional intention and untimed dismissal. This suite seeds near-target state
  and advances visit metadata to test boundaries; it does not wait 30 minutes. Real
  elapsed-time checkpoint coverage comes from the separate screenshot run below.
- **Release screenshots:** eight captures from the final extracted ZIP, including five
  1280×800 Store candidates. The live introduction and checkpoint were visually inspected.
  The checkpoint followed a real one-minute foreground session, without seeding elapsed
  time; subsequent real UI actions created the photographed local history. Supplemental
  popup-document captures do not establish native toolbar placement. Final publisher
  artwork approval remains separate.
- **Recovery:** verified bundle restore and hydration/hash verification of all 149 baseline
  LFS files passed. Default LFS pointer-check error and backup exclusions are documented
  in `legacy/README.md`; production data was not backed up.

Older Chrome (manifest minimum 111), human screen-reader use, physical sleep/wake and
toolbar placement, signed-in/populated Home, non-English and experimental layouts remain
unverified. GitHub-hosted CI and Vercel platform routing were not run. The public Issues
route returned HTTP 200; the existing email's delivery was not tested. No scrolling-time
reduction or broad live usability claim follows from these checks.

## Boundaries

No public deployment, push, Store submission, service shutdown, auth change, production
DB access, ingestion or data deletion. Vercel routing still needs platform-preview QA.
The site artifact is independent; replacing old study/account UI on production remains
conditional on consumer checks. Database/auth/avatar/research retention is separate.
See `../deployment/README.md` for exact URL behavior, the unapplied patch and rollback.
