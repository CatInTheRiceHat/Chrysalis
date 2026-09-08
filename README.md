# Chrysalis — YouTube, on your terms

Chrysalis is an independent Chrome extension for desktop `www.youtube.com`.
Plan a session, notice foreground time, and choose which supported recommendation
surfaces to hide. Targets, breaks and reflections are optional. No accounts,
analytics, cloud sync or claims of proven behavior change.

## Active products

- **`extension/`** — version 0.8.0, storage schema 7. Centered introduction, compact
  side timer, check-ins, reversible viewing controls and local history.
  [Install/update](extension/INSTALL.md) · [Privacy](extension/PRIVACY.md).
- **`public-site/`** — independent static project, installation, privacy and contact
  pages. [Build/verify](public-site/README.md).

```sh
git lfs pull
cd extension
npm ci
npm run check
npx playwright install chromium
npm run test:package
```

Load `extension/dist/` or the extracted release folder through `chrome://extensions`
→ Developer mode → Load unpacked. Keep the installation path stable for updates.
These commands do not publish to the Chrome Web Store or deploy a website.

```sh
cd public-site
npm ci
npm test
npm run preview
```

The public build is `public-site/dist/`. It never builds/imports the old app.
CI verifies both products, synchronized privacy content and the service boundary.

## Preserved prototype

The original React feed (`website/`), Python recommendation/backend (`api.py`,
`api/`, `core/`, `integrations/`), associated scripts/tests/migrations and independent
Flutter prototype (`intentional_social/`) are retired from active product development.
Their paths remain intact. None is a prerequisite for the extension.

Baseline: **`legacy-web-baseline-2026-09-07`**, revision
`5228d0df5e983b46e57f4e403450c976a4fc81f0`. Git history and referenced LFS objects
were backed up locally; production data was not included.
[Recovery](docs/legacy/README.md) · [Original README](docs/legacy/README-baseline.md).

**Service retirement is separate.** Vercel now builds the public site but retains
Python API routing and existing crons; the ingestion workflow remains unchanged.
Deploying replaces old study/auth UI with notices, so confirm active users and
participants before production cutover. An unapplied service-retirement patch is
prepared for a later explicit decision. [Deployment/data checklist](deployment/README.md).

[Current validation](docs/extension-implementation-status.md) ·
[Transition record](docs/extension-public-site-transition.md) ·
[Unsubmitted Store draft](extension/distribution/STORE_DRAFT.md).

Support: https://github.com/CatInTheRiceHat/Chrysalis/issues. The original website
lists elaineyouyuanche@gmail.com. Do not post session notes, recovery links or
participant credentials publicly.
