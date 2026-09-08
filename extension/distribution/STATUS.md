# Distribution status — Chrysalis 0.8.0

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
