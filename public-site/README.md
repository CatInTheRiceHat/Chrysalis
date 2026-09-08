# Chrysalis public website

Independent static HTML/CSS/JavaScript, built with Node. No runtime packages, feed,
auth client, API, analytics or external fonts. Licensed local branding was copied
from Chrysalis. Routes: `/`, `/install`, `/privacy`, `/contact`, `/legacy`, plus an
old-account/study notice and a real 404 page.

```sh
npm ci
npm run build
npm run preview  # http://127.0.0.1:4178
npx playwright install chromium
npm test
```

`dist/` is deployable. Playwright is only a development dependency. Evidence goes to
ignored `test-results/`. The build never reads extension or legacy source/artifacts.
Privacy is a checked-in copy synchronized by the explicit root authoring command
`node scripts/sync_extension_privacy.mjs`; CI checks equality.

## Contact and installation provenance

The public repository and Issues page returned HTTP 200 on 2026-09-07 PDT:
https://github.com/CatInTheRiceHat/Chrysalis and its `/issues` route.
Email comes from `website/src/components/Contact.jsx` and `RebootPage.jsx` at the
baseline. The mailto target is checked; actual delivery was not tested. No messages
were sent. Public issue submission requires GitHub login and must not contain private data.

Installation supports project-supplied ZIPs and source builds. No download button,
Store listing, survey or hosted policy URL is invented. The baseline tag is local
until pushed, so the site links to the repository rather than an unpublished tag URL.

Root `vercel.json` targets this build but preserves Python API routing and schedules.
Old account/study UI becomes notices on deployment: consumer checks must precede
production cutover. See `../deployment/README.md`. Nothing has been deployed publicly.

## Hosted verification and separate hosting

Run `npm run build`, then
`CHRYSALIS_SITE_URL=https://YOUR-DEPLOYMENT node tests/hosted.mjs` from this directory.
It checks actual routing/refreshes, HTTPS, headers, mobile/desktop, links and asset hashes;
it never visits API or cron paths. A protection/login response fails explicitly.
Reports/screenshots go to `test-results/hosted-HOST/`.

`vercel.json` here supports a separate static project without APIs, crons or legacy
secrets. Root `../vercel.json` still preserves existing services. See
`../deployment/launch-cutover.md` for the current production state and safe hosting steps;
the original not-deployed statements above describe the earlier transition only.
