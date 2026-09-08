# Distribution readiness — Chrysalis 0.7.1

Prepared and verified 2026-09-07. Nothing uploaded, submitted, published or sent to
volunteers. No telemetry, accounts, backend, extra permissions or migrations added.

## Exact artifacts

| Artifact | Location (relative to `extension/`) |
| --- | --- |
| Production build | `dist/` |
| Installable extracted package | `release/chrysalis-0.7.1-unpacked/` |
| Distribution ZIP, manifest at root | `release/chrysalis-0.7.1.zip` |
| Archive checksum | `release/chrysalis-0.7.1.sha256` |
| Per-file SHA-256 inventory/toolchain | `release/chrysalis-0.7.1-build-manifest.json` |
| Browser validation bound to ZIP hash | `release/chrysalis-0.7.1-validation.json` |
| Real screenshots/provenance | `distribution/screenshots/` |
| Draft 440×280 promotional artwork | `distribution/artwork/promo-440x280.png` |
| Store copy/policy review | `distribution/STORE_DRAFT.md` |
| Volunteer guide/questionnaire/case-study outline | `pilot/` |

ZIP: **968,790 bytes**, **17 allowlisted files**. SHA-256:

```text
db3f4ec6888445d6c9a7af06b3495df31f19cf3ffb6fa83829762c32179c50e8
```

Only runtime HTML/CSS/JS, manifest, local artwork/icons/fonts and required font
licenses are in the ZIP. No source, node_modules, test fixtures, personal Chrome
profile data, screenshots, documentation bundle, unrelated application files or
`.env` files. The expanded package is extracted from that exact ZIP. Every file is
byte-identical to the verified `dist` build. The ZIP is reproducible, not signed.
`release/` is generated/ignored; commands reproduce it from checked-in inputs.

## Commands actually run and results

Toolchain: Node 20.17.0, npm 10.8.2, Python 3.13.1; Chromium 153.0.8010.12.
Commands below run from `extension/`, except the final diff check.

| Command/check | Result |
| --- | --- |
| `npm ci` | Passed; locked dependencies installed |
| `npm run check` | 63 Node tests, strict TypeScript and production/reference validation passed |
| `npm run package` | Created ZIP/extracted folder/checksum/inventory; all 17 files verified |
| `npm run test:package` | Two clean builds yielded identical ZIP bytes; unexpected development asset/missing script guards passed; all seven real extension-enabled browser suites passed on the extracted package |
| `npm run screenshots` | Seven genuine screenshots captured; live foreground minute reached a checkpoint, explicit UI revisions/continuation/break/Finish/Skip produced the pictured history; packaged offline privacy link/page verified |
| Manual screenshot inspection | Live checkpoint, recorded history and icon inspected; additional viewing/intro/privacy checks recorded with capture evidence |
| Python ZIP/signature inspection | CRC passed; known credential/private-key signatures had zero matches; membership matched allowlist |
| `git diff --check` from repository root | Passed |

Earlier hardening already verified observed live related/Shorts surfaces, player
progress and search/subscriptions navigation. Current packaged suites repeat lifecycle,
control fixtures, restart, focus, fullscreen, keyboard/zoom and deletion behavior.
Current live capture verifies the signed-out Home session/checkpoint flow; it does
not upgrade populated Home selectors from fixture-only evidence. Popup documents
are real extension pages, but the native toolbar popover remains a manual check.

A signature scan is bounded, not proof that every possible secret format is absent.
Screenshots come from disposable automated test sessions, not participant research.
The runtime includes no initial histories or screenshot example data.

## Readiness and remaining blockers

**Ready for personal unpacked installation. Pilot materials are complete; launch of
a small volunteer pilot is conditional, not certified by these automated checks.**

Before inviting volunteers, the organizer should run the preflight in
[pilot/GUIDE.md](../pilot/GUIDE.md): actual native Chrome toolbar installation/use,
intended signed-in/populated layouts, physical sleep recovery and relevant player/
accessibility setups; explain support/feedback channel and retention. No facilitator
contact was invented. Unknown layouts fail open; conservative timing may undercount
or ask for Resume. Do not promise precise watch time or control of every layout.
Chrome 111, all ads/captions/player modes and physical screen readers are unverified.

**Not ready for Chrome Web Store submission.** Official requirements were checked;
[STORE_DRAFT.md](STORE_DRAFT.md) contains linked sources and prepared fields. Missing:
verified publisher/contact and account setup, hosted privacy-policy URL, final
metadata/artwork review, and resolution of the current FAQ's encryption-at-rest
language against this build's unencrypted local Chrome storage. No policy approval,
legal conclusion or store acceptance is claimed. Private/unlisted store pilots still
require review. Distribution-channel updates and migration from unpacked IDs are
not yet verified or implemented.

Scope of 0.7.1: distribution tooling, standard icon exports, an offline full-privacy
page linked from settings, corrected version footer and documentation/materials.
Session model/schema 6, viewing controls and retention remain as verified in 0.7.0.
