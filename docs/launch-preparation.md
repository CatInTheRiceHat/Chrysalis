# 0.8.0 launch preparation

Started from clean `e3462b6`; remote main already contained both transition commits.
No unrelated local changes were present. Work is on `launch/extension-0.8.0`.

- Pushed the launch branch, `extension-v0.8.0` (unchanged target `74740a3`) and
  `legacy-web-baseline-2026-09-07` (target `5228d0d`). No force push/tag replacement.
- Original hosted CI run 34187746344 failed on a hard-coded 390px native viewport;
  Linux Chrome supplied 420px. The test now checks 390px content width and viewport fit.
  Launch run 34188983256 then exposed immediate native-popup reopening failure after
  target closure. The harness now observes closure and polls the real Chrome API.
  Both fixes affect tests only. Follow the [launch-branch runs](https://github.com/CatInTheRiceHat/Chrysalis/actions?query=branch%3Alaunch%2Fextension-0.8.0)
  for final hosted status; no test success is inferred from a push.
- Vercel deployed launch revision `ad8fad6` as **Preview**, deployment 6320956539:
  https://chrysaylis-fl5q0q5rk-catinthericehat.vercel.app . Protection redirects to
  Vercel login. This is deployed but not anonymous-preview-QA-passed.
- Before this task, production had already deployed `e3462b6`. Its public origin,
  https://thechrysalisproject.vercel.app , passed 24 routes/direct refreshes, 375/760/1440px,
  keyboard navigation, theme persistence, headers, HTTPS, local links, asset hashes and
  zero external page requests. Desktop/mobile screenshots were visually inspected.
  Checked-in reports are in `releases/0.8.0/launch/`; this is production evidence and
  must not be relabeled as preview evidence. No production mutation was performed.

## Prepared deliverables

- [Storage decision and code-grounded disclosures](launch-storage-policy.md): 0.8.0
  remains unencrypted; hold Store certification. Exact choice is encrypted durable
  history with unlock (recommended), or session-only personal data without history.
- [Store listing and permission drafts](../extension/distribution/STORE_DRAFT.md).
- [Installation identity and remaining account requirements](../extension/distribution/STORE_IDENTITY.md).
- Local `extension/release/chrysalis-0.8.0-store-preparation/`: immutable ZIP/checksum,
  five actual 1280×800 release screenshots with hashes, 128px icon, 440×280 promo,
  provenance, listing, privacy/disclosure and identity materials. All seven images
  were visually inspected; sizes/PNG channels/hashes checked. No new image claims or
  participant data. Reconstruct using `node scripts/prepare-store.mjs` in `extension/`.
- [Production recovery/cutover commands and access gaps](../deployment/launch-cutover.md),
  plus `public-site/vercel.json` for a separate static origin without APIs/crons.

The 17-file verified ZIP remains SHA-256
`a618767617e8ca50a66be7e19e89b2f218a4d24aef2011e23355aa18f38c28d9`.
No runtime/package/privacy-source modification, version bump, Store upload, publisher
claim, invitation, support message, service retirement or production-data backup.

## Exact remaining access/actions

1. Reauthenticate Vercel for `catinthericehat/chrysaylis` and allow authenticated
   preview QA or supply a protection-bypass value through a secure environment channel.
   Do not disable production protections. Local CLI token is invalid.
2. Choose durable encrypted history plus unlock versus session-only storage. Any
   implementation requires a new version, migration/privacy updates and package checks;
   preserve 0.8.0. Obtain publisher registration, verification, account security and
   current dashboard certifications before eventual submission. No automatic history
   transfer from unpacked IDs to a future Store ID is implemented.
3. Restore read-only access to the real production Supabase project and traffic/settings.
   Current local DSN fails tenant lookup and differs from the linked project. Active
   users/studies/consumers remain unknown, while scheduled ingestion is demonstrably active.
4. Decide whether to keep the already-live notices during investigation or restore
   the old UI after validating the previous deployment. Do not infer consumer clearance.
   If restoring it, first retain privacy/support routes or use the separate static origin.
