# Public Chrysalis 0.9.0 privacy/support hosting

Published with owner authorization on 2026-09-08, independently of the existing application.

- Privacy: https://chrysalis-extension-pages.vercel.app/privacy
- Support: https://chrysalis-extension-pages.vercel.app/contact
- Vercel team: `catinthericehat` (`team_qRrP9rWBVuzcNJkq2sSd0d3Q`)
- New static project: `chrysalis-extension-pages` (`prj_RC8b95pWCcK7DICVKUrJsd8wZahq`)
- Deployment: `dpl_3mtrnKbmq34c8wYr3nrjNsdjJdr9`
- Immutable deployment URL: https://chrysalis-extension-pages-estzs87ss-catinthericehat.vercel.app
- Static source: `public-site/` from verified release revision `b46ab1b02a1b08ba8375dd0f0b4e4fac70bccbe3`.

Use the stable project-domain privacy URL in the Store, not the immutable deployment URL. The project retains Standard Protection: public production domain, protected preview/deployment URLs. The existing release preview remains protected and was not repointed or made public.

## Isolation and evidence

Deployment used a disposable directory containing only `public-site/assets`, `src`, `scripts`, package/lock files and `public-site/vercel.json`. Its link explicitly names the new project ID; no repository/root `.vercel` link was created. No Git connection or project environment variables were configured. CLI linking generated a temporary local OIDC file excluded by its ignore rules; that file was removed. No backend code, API rewrite, cron, Supabase configuration or secret was copied.

The existing project's production deployment `dpl_D5HJkwZSoz5LYM55iLtP65W8RvX8`, production aliases (including `thechrysalisproject.vercel.app`), `main` branch, build/root settings and `all_except_custom_domains` protection setting were read before and after publication and match. Root repository routing, APIs, crons and ingestion workflow were not edited or invoked. This says nothing about whether old accounts/study consumers remain active.

Anonymous HTTPS GETs to `/privacy` and `/contact` returned 200 without redirect/login and matched the reviewed HTML byte-for-byte. Privacy HTML SHA-256: `715ff76c8d036fc15a5c1162f3ede43333a196d07dcc8097e04afd72e6a1439e`. The local source matches the preserved 0.9.0 ZIP's packaged policy via the privacy synchronization check. The public policy includes default session-memory retention, optional encrypted history/key lifecycle, explicit old-plaintext migration, restart loss, deletion, in-page intention exposure, and separate hosting/feedback handling.

The anonymous hosted browser runner passed 24 route/refresh checks, six public pages, legacy notices, 404, responsive layouts, navigation, contact/internal links, HTTPS headers and five asset hashes. No page errors or unexpected external requests. Generated evidence: `public-site/test-results/hosted-chrysalis-extension-pages.vercel.app/report.json`; publisher kit: `public-policy-publication.json`.

## Maintenance

Keep this project and its stable production domain available while used by the Store listing. It is deliberately not connected to Git: ordinary launch-branch pushes cannot replace its public policy. For future policy updates, synchronize from the reviewed extension privacy source, build/test `public-site/`, stage only that independent directory, link explicitly to `chrysalis-extension-pages` in `catinthericehat`, and deploy with its own `vercel.json`. Verify the linked project ID before any production deployment. Never deploy the repository root to this project, attach existing application domains to it, or copy application environment variables.

If a future public-pages deployment needs rollback, roll back only this new project's deployment to the verified static deployment above, then anonymously recheck `/privacy` and `/contact`. Do not roll back or promote the existing `chrysaylis` application. If an extension release changes data practices, keep the Store privacy URL accurate for that release instead of restoring an outdated policy.

No Store item was created or submitted. The 0.8.0 and 0.9.0 ZIPs/tags are unchanged. Remaining publisher actions are in `extension/distribution/PUBLISHER_CHECKLIST.md`.
