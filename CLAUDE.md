# Chrysalis

Active products: the desktop YouTube Chrome extension in `extension/`, and the
independent static supporting site in `public-site/`. No Instagram or standalone
app work unless requested. Describe actual user choice and foreground-time behavior;
make no claims of measured improvements or exact watch time.

## Verify

- Extension: `cd extension && npm ci && npm run check`; release browser checks:
  `npm run test:package`. Use disposable profiles. Live checks are separate.
- Site: `cd public-site && npm ci && npm test`; build: `npm run build`.
- Privacy: edit `extension/PRIVACY.md`, then run
  `node scripts/sync_extension_privacy.mjs` at the root. Both product builds use
  checked-in local copies and remain independent.
- Service boundary: `node --test scripts/transition.test.mjs`.

## Legacy boundary

`website/`, Python feed/backend code and `intentional_social/` are preserved
prototypes. Baseline tag: `legacy-web-baseline-2026-09-07`.
See `docs/legacy/README.md` and `deployment/README.md` before changing that boundary.
Archiving development does not authorize shutting down APIs, jobs, authentication,
databases or storage. Root deployment retains Python APIs/crons deliberately.

Original instructions are preserved at `docs/legacy/CLAUDE-baseline.md`; their sibling
historical archive reference is not known to be recoverable here.
