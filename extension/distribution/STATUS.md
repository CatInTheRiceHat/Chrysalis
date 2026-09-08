# Distribution status — Chrysalis 0.9.2

Timed-session release: untimed start/continuation options are removed, minutes are directly editable in the introduction/popup/default preferences, and tab-change visibility signals are retained across pending worker requests. The close button and Escape remain available. Existing history and privacy/storage behavior are unchanged.

Current artifacts use `release/chrysalis-0.9.2*`. See [release evidence](../../docs/releases/0.9.2/README.md). The verified 0.9.1 and 0.9.0 artifacts are preserved. Updated Store copy and captures accompany the new package; no Store submission is performed.

---

## Historical release status

# Distribution status — Chrysalis 0.9.1

Automatic desktop YouTube startup release. The content script starts at `document_start`, initializes through the worker immediately, and mounts the introduction when a body exists. Neither full page loading nor popup setup is required. The introduction pauses autoplay and does not start timing; users choose Start, dismissal or Continue without a timer. Active sessions, timer preferences and the existing local privacy/storage design are preserved.

Artifacts: `release/chrysalis-0.9.1.zip`, matching `.sha256`, `-unpacked/`, `-build-manifest.json`, `-validation.json`, `-screenshots/` and `-store-preparation/`. The package suite now includes the no-popup startup/lifecycle test, for twelve browser suites. See [startup evidence](../../docs/releases/0.9.1/startup.md). The 0.9.0 and 0.8.0 artifacts remain preserved.

Store copy and installation guidance now describe automatic entry and the introduction's playback pause. Public-site source is synchronized; deployment and Store submission have not been performed. Account certifications remain the publisher's responsibility. No zero-latency or universal YouTube-layout guarantee is made.

---

## Historical 0.8.0 distribution record


**0.9.0 storage update:** current activity is browser-memory-only; optional completed history is password-encrypted, and unlocking never gates viewing. Browser restart/reload/update/disable clears temporary activity; earlier plaintext requires an explicit encrypt/delete choice. This supersedes older persistence/restart statements below. See [current privacy policy](../PRIVACY.md) and `docs/encrypted-history-storage.md`.

Verified developer preview; Store upload/submission/publication has not occurred.
The website was already deployed before launch preparation; see
`../../deployment/launch-cutover.md`. See the current transition record at
`../../docs/extension-public-site-transition.md` for actual check results.

## Reproducible artifact

Run from `extension/`: `npm ci`, `npm run check`, `npm run test:package`.

- `release/chrysalis-0.8.0.zip`: manifest at root, 17 allowlisted runtime files.
- `release/chrysalis-0.8.0-unpacked/`: independently extracted and byte-compared.
- `release/chrysalis-0.8.0.sha256`: ZIP checksum.
- `release/chrysalis-0.8.0-build-manifest.json`: source revision/digest and dirty flag,
  toolchain, ZIP hash and each source/artifact file hash.
- `release/chrysalis-0.8.0-validation.json`: ten browser suites bound to the ZIP hash.

Only local runtime JS/HTML/CSS, fonts/licenses and artwork/icons are packaged. Exact
membership/reference checks reject development files and missing scripts; bounded scans
reject known credential signatures and runtime network/sync code. These scans are not
proof against every possible secret format. Source/docs/tests, legacy assets, profiles,
.env files, screenshots and histories are excluded. Two clean builds must match bytes.
The ZIP is reproducible, not signed. Use a trusted source and expected checksum.

## Scope and readiness limits

Storage schema 7; migrate valid existing local data without reset. Keep the same
installation entry/path for updates; older schema readers and unpacked-to-Store
identity migration are not assumed safe. No export/cloud backup is implemented.

Personal unpacked use is supported after package acceptance. Signed-in/experimental
layouts, physical sleep/wake, screen readers, older Chrome and physical toolbar behavior
need relevant manual preflight before recruiting testers. Do not present fixture coverage
as proof for every YouTube layout or as evidence of reduced scrolling time.

Policy/support pages are now verified at https://thechrysalisproject.vercel.app/privacy
and /contact. Store submission still needs verified publisher/account and dashboard
declarations plus the storage product decision in `../../docs/launch-storage-policy.md`.
Identity guidance is in `STORE_IDENTITY.md`; cross-ID migration is not implemented. Public
support Issues is verified and repository email is documented. Eight versioned captures
were generated from the verified ZIP in `release/chrysalis-0.8.0-screenshots/`, including
five Store-sized candidates and a real one-minute live checkpoint. Review the capture
report and final artwork before submitting. Old 0.7.1 images remain historical.

The launch branch has a Vercel preview; unauthenticated inspection is blocked by Vercel protection. Production already serves the public site. See the launch record for current evidence.
See `STORE_DRAFT.md` for prepared copy and remaining owner decisions.
