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

Authenticated preview QA completed on the exact release deployment using the owner's Vercel CLI sign-in and a temporary isolated browser session. All 24 routes/refreshes and five asset hashes passed. The preview remains protected. See the source-bound `extension/release/chrysalis-0.9.0-preview-validation.json` and Store kit `HOSTED_PREVIEW.md`.

The reviewed privacy policy is now public at https://chrysalis-extension-pages.vercel.app/privacy; support is at https://chrysalis-extension-pages.vercel.app/contact. Anonymous HTTPS responses exactly match the reviewed 0.9.0 HTML. See [hosting and preservation evidence](../../../deployment/public-extension-pages.md).

No Supabase access, production data query, legacy-service mutation, production routing change or ingestion request is part of 0.9.0 preparation. The ingestion workflow has schedule/manual triggers only; launch pushes do not trigger it. Root Vercel APIs/crons and deployment configuration remain unchanged. Vercel schedules crons on production deployments, not previews ([official cron documentation](https://vercel.com/docs/cron-jobs/quickstart)). This is not evidence that old account/study consumers are inactive; the separate [cutover and rollback requirements](../../../deployment/launch-cutover.md) remain in force.

## Owner actions before a later Store submission

Complete publisher account registration/security, verified publisher/contact information, trader status where applicable, distribution choices and final dashboard certifications. See [the owner checklist](../../../extension/distribution/PUBLISHER_CHECKLIST.md). Public-policy and preview-authentication blockers are resolved.

Do not submit or publish the extension as part of this task. No further storage product decision is pending. Existing unpacked users must explicitly choose what to do with old plaintext; a future Store item starts with separate empty storage and does not import their settings/history automatically.
