# Launch deployment and recovery runbook

## Observed state, 2026-09-07 PDT

The earlier “not deployed” record is historical. Before this task, remote `main`
already pointed to `e3462b61a040654502348c98e58038687cd37769`. GitHub deployment
6320747044 records a successful **Production** deployment of that revision to
Vercel team `catinthericehat`, project `chrysaylis`, deployment
`D5HJkwZSoz5LYM55iLtP65W8RvX8`.

`https://thechrysalisproject.vercel.app` now serves the public extension site,
including account/study notices. The prior production deployment is
`https://chrysaylis-rckepz8ay-catinthericehat.vercel.app`, source
`5228d0df5e983b46e57f4e403450c976a4fc81f0`, GitHub deployment 6320023113.
It requires Vercel authentication; its current usability was not verified.

This task pushed only `launch/extension-0.8.0` and named tags. The Git integration
created a **Preview** deployment. No production branch push, promotion, alias change,
service retirement, ingestion dispatch, migration or record mutation was performed.

## Consumer evidence and missing access

- Recent scheduled GitHub ingestion runs succeeded, including run 34187026089 on the
  baseline revision. This is evidence of an active job, not active human users.
- Vercel's saved CLI credential is invalid (API 403; CLI also rejects it). Project
  overrides, domain inventory, traffic/request logs, production/preview environment
  mapping, cron execution logs and auth callbacks could not be inspected.
- A connection using the available DATABASE_URL, with read-only transactions,
  statement/connect timeouts and TLS, failed with tenant-not-found. Its project
  identity differs from the repository's linked Supabase project. No rows were read.
- Account use, active research participants, pending deletion requests, external API
  consumers and uploaded-asset use remain **unknown**. No absence-of-use inference.
- Source/LFS recovery is verified separately. No production database/auth/object
  backup or restoration was performed.

Owner action: restore Vercel CLI/team access and read-only access to the actual
production Supabase project (not just the stale local DSN). Inspect aggregate account
sign-ins in 7/30/90-day windows, research participant/session status and recent event
counts, unresolved withdrawal/deletion requests, usage-event activity, object counts,
and aggregate route/status/consumer traffic. Avoid exporting identities or tokens.
Check Supabase Site URL, redirect allowlist, OAuth callbacks and recovery flows.
Confirm research/support obligations with the service owner; logs alone cannot settle them.

## Exact decision now needed

Production has already cut over without established consumer clearance. Choose
whether to keep the current notices while investigating, or restore the previous
application after validating its deployment. Recommendation: if any old users/studies
still depend on it, restore their UI and publish extension pages on a separate static
origin. Unknown use is not a reason to delete or retire services.

## Recovery sequence (prepared, not executed)

1. Sign in with `npx vercel login`; inspect the `catinthericehat/chrysaylis` project.
   Record its current production aliases, deployment, build/root overrides, env scope
   names, function/cron settings and routing without printing secret values.
2. Open the prior deployment above with team access. Verify its sign-in, reset and
   study UI with dedicated test accounts; never use participant credentials. Confirm
   it points at the intended existing services. Check the old deployment's API routes
   and schedules against the current ones before rollback.
3. Retain both deployment URLs and obtain independent database/Auth and object-storage
   backups with an owner-approved restore test. Do not run destructive migrations.
4. After the owner chooses restoration, execute:

   ```sh
   npx vercel rollback https://chrysaylis-rckepz8ay-catinthericehat.vercel.app --scope catinthericehat
   ```

   Use [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback) in the dashboard
   if the account/plan does not support the CLI operation. Do not redeploy baseline
   source blindly with today's environment values.
5. Verify actual production aliases, `/`, sign-in/recovery/study UI, non-mutating API
   health, avatar URLs, cron configuration and subsequent naturally scheduled jobs.
   Observe errors and aggregate traffic. Do not manually trigger ingestion as a test.
6. Reversing that rollback requires an explicit decision to re-promote the public site:

   ```sh
   npx vercel promote https://chrysaylis-e198iyfmi-catinthericehat.vercel.app --scope catinthericehat
   ```

   See [CLI rollback](https://vercel.com/docs/cli/rollback). A routing rollback restores
   no deleted data and does not change extension schema/version.

## Future deliberate cutover

After consumer clearance and backup verification, test the exact proposed revision
on an authenticated preview, including all routes using `tests/hosted.mjs`. If old
UI remains needed, first provision an agreed legacy origin and preserve callbacks,
deep links and session behavior; keep account/study paths routed to working UI until
that migration is verified. Do not replace these paths with notices first.

Record the existing production deployment as the rollback target. Promote only the
verified candidate in a monitored window; check aliases, pages, security headers,
assets, legacy routes and preserved services. Roll back to the recorded target for
broken account/recovery/study flows, routing failures or asset loss. Keep the separate
`retire-legacy-services.patch` unapplied. No API/auth/database/bucket/cron shutdown is
part of a website cutover.

## Independent privacy/support hosting

The current `/privacy` and `/contact` are publicly reachable. If restoring the old
application, preserve these destinations or move the static site first to a separate
Vercel project/origin and update Store drafts before submission. `public-site/vercel.json`
is a self-contained static configuration with legacy notices and no APIs/crons.

From `public-site/`, after authentication, link to a **new, separate** project with
root at that directory and no environment secrets, then run `npx vercel deploy`.
Verify its preview; publish only that separate project when authorized. Do not attach
the existing application's production domain. A publicly accessible stable origin is
required for policy/support; a Vercel-login-protected preview is insufficient.

Vercel documents [previews as separate from production](https://vercel.com/docs/deployments/overview)
and [crons as production-only](https://vercel.com/docs/cron-jobs/quickstart).
The unchanged GitHub ingestion workflow runs only on its schedule or manual dispatch,
not launch-branch pushes. Root previews still include legacy Python functions; without
environment access, database isolation cannot be certified. QA therefore never invokes
those APIs or cron paths. Build scripts only generate static files.
