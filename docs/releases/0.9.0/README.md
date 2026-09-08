# Chrysalis 0.9.0 launch preparation

The storage decision is implemented in this new release. The verified 0.8.0 ZIP and `extension-v0.8.0` remain unchanged. Work stays on `launch/extension-0.8.0`; its historic branch name does not describe the new package version.

- [Storage field inventory, encryption and migration](../../encrypted-history-storage.md)
- [Privacy policy](../../../extension/PRIVACY.md)
- [Listing, permissions and proposed disclosures](../../../extension/distribution/STORE_DRAFT.md)
- [Unpacked/Store identity and update guidance](../../../extension/distribution/STORE_IDENTITY.md)
- [Installation and restart behavior](../../../extension/INSTALL.md)
- [Hosted launch-branch verification](https://github.com/CatInTheRiceHat/Chrysalis/actions/workflows/extension-ci.yml?query=branch%3Alaunch%2Fextension-0.8.0)

Generated, version-bound deliverables are in `extension/release/`: `chrysalis-0.9.0.zip`, `.sha256`, `-build-manifest.json`, `-validation.json`, `-screenshots/capture-report.json`, and `-store-preparation/inventory.json`. The build manifest records exact source revision/dirty state and every packaged file hash. The validation must match that ZIP; screenshots are captured from its extracted bytes. No screenshot, metadata file or publisher document belongs inside the upload ZIP.

Acceptance includes 81 unit tests and eleven packaged browser suites, including migration, wrong passwords, actual browser and service-worker restarts, locked viewing, confirmation/cancellation, deletion and storage failures. Consult the resulting validation/CI run for actual pass status. Screenshots use a disposable signed-out profile and actual extension UI. Populated authenticated YouTube, physical sleep/wake, minimum-version Chrome and human screen-reader use remain outside this automated evidence; no universal layout or accessibility claim is made.

## Preview authentication and scope

Git integration deploys launch commits as Vercel Preview, while `main` stays at `e3462b6`. Exact deployment URL/revision/status is obtained from GitHub deployment records. Run `public-site/tests/hosted.mjs` against that immutable URL; it checks direct navigation, refreshes, six public routes, legacy notices, 404, responsive layouts, links, HTTPS and matching assets. It asserts the 0.9.0 policy. Do not use a production pass as preview evidence.

The CLI currently requires owner sign-in: run `npx vercel login`, complete browser authentication using an account with access to `catinthericehat/chrysaylis`, then notify the assistant. Do not paste a token. Vercel's [authenticated curl command](https://vercel.com/docs/cli/curl) can establish authorized access to the exact deployment. For browser QA, the hosted runner also accepts `CHRYSALIS_SITE_AUTH_STATE` pointing to an explicitly authorized isolated Playwright session-state file. Never use a personal Chrome profile, commit cookies or disable deployment protection.

Without that authentication, a protected response is a blocker, not a hosted QA pass. The outstanding sign-in does not block the package and Store-material preparation.

No Supabase access, production data query, legacy-service mutation, production routing change or ingestion request is part of 0.9.0 preparation. The ingestion workflow has schedule/manual triggers only; launch pushes do not trigger it. Root Vercel APIs/crons and deployment configuration remain unchanged. Vercel schedules crons on production deployments, not previews ([official cron documentation](https://vercel.com/docs/cron-jobs/manage-cron-jobs)). This is not evidence that old account/study consumers are inactive; the separate [cutover and rollback requirements](../../../deployment/launch-cutover.md) remain in force.

## Owner actions before a later Store submission

1. Complete Vercel sign-in so exact-preview browser QA can finish while protection stays enabled.
2. Provide publisher account access/setup: registration, two-step verification, verified publisher/contact details, dashboard selections and final certifications. No Store URL, item identity or publisher identity is invented.
3. Publish the matching 0.9.0 privacy page at a stable public HTTPS URL before submitting. The current public site still serves the earlier policy; the authenticated preview is insufficient. A separate static Vercel project rooted at `public-site/`, with its independent no-API/no-cron configuration and a new public domain, can serve privacy/support without repointing the existing application or copying backend secrets. Provisioning that public destination is a separate authorized production action.

Do not submit or publish the extension as part of this task. No further storage product decision is pending. Existing unpacked users must explicitly choose what to do with old plaintext; a future Store item starts with separate empty storage and does not import their settings/history automatically.
