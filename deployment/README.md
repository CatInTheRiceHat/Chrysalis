# Public-site cutover and separate service retirement

## Historical transition preparation

**Launch update:** production had already deployed before launch preparation began.
See [the current cutover/recovery runbook](launch-cutover.md) for observed hosting,
access gaps and exact rollback steps. The following records the earlier preparation.

Root `vercel.json` builds `public-site/` into `public-site/dist/`; `.vercelignore`
excludes the original React/Flutter/extension source and historical assets from that
deployment. The site uses none of the legacy backend.

**Existing `/api/*` routing, Python source/dependencies and both Vercel crons remain.**
The GitHub ingestion workflow is unchanged, including four runs per day and manual
dispatch. No environment configuration, records, accounts or jobs were changed.
Extension CI and packaging are independent of Vercel.

The retained crons reference `/api/cron/drop` but code implements `/api/cron/extract`.
This pre-existing mismatch is not proof of inactivity and was not silently changed.

## Old URLs after deployment

| URL | Prepared behavior |
| --- | --- |
| `/` | Extension overview |
| `/algorithm`, `/reels`, `/home`, `/community`, `/challenges`, `/saved`, `/search`, `/inbox`, `/u/:username` | Preserved-project notice |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/diagnostic`, `/study`, `/profile`, `/profile/edit` | Account/study notice and private contact instructions |
| `/api/*` | Existing Python routing |
| Unknown paths | 404 with recovery links |

Internal rewrites avoid declaring old URLs permanently moved to an unrelated product.
The site reads no recovery tokens. A no-referrer header prevents external links from
receiving the referring URL.

**Local site readiness does not establish a safe production cutover.** Replacing study
or password-reset UI can interrupt people even if APIs stay online. First inventory
traffic, active participants, recovery flows, OAuth redirects, domains, owner and
platform overrides. If old UI remains needed, preserve the previous deployment at an
agreed legacy origin and adjust route rules/account callbacks before cutover. No such
origin has been invented. Public deployment is outside this task.

## Unapplied retirement patch

`retire-legacy-services.patch` is a separately reviewable proposal, **not applied**.
It removes API routing/crons, excludes Python functions/dependencies from deployment,
and removes the GitHub ingestion workflow. Removing the rewrite alone would not
remove directly addressable functions. The patch deletes no production data and
does not disable Supabase Auth, buckets or cloud projects or revoke keys.

Apply only after an explicit service-retirement decision. Review independently and
test against the then-current configuration; no deploy command applies it automatically.

## Remaining decisions

- Database retention, schema/data backup and restore test: feeds, preferences, trust/
  curation, diagnostics, usage events, research participants/sessions/events and provenance.
- Existing auth accounts, OAuth redirects, password recovery and deletion/support access.
- Avatar bucket contents/public URLs and retention independent of database rows.
- Active participants, queued events, external API consumers and service owners.
- YouTube API usage, GitHub ingestion, Vercel schedules and any other actual deployments.
- Backup access/retention. Git history is not a production-data backup.
- Website-local saved/liked videos and reflections and independent Flutter data are not
  imported into the extension or preserved by a server backup.

## Checks and rollback

Run site tests and `node --test scripts/transition.test.mjs`. Before public cutover,
verify platform-preview rewrites, headers and retained API responses with non-mutating
checks. Local tests never start Python, ingest content, migrate or connect to a database.
Actual Vercel routing still requires preview QA.

Keep the previous deployment and services available through the cutover observation
period. Restore that deployment or baseline source/configuration from
`legacy-web-baseline-2026-09-07` if needed. Code rollback cannot restore deleted data;
later data mutations need separately tested backups. See `docs/legacy/README.md` for
source/LFS recovery. Website rollback must not downgrade extension schema 7.
