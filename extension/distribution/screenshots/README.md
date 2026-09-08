# Current 0.9.1 screenshots

Run `npm run screenshots` after packaging. The current screenshots and their hash-bound provenance are in `release/chrysalis-0.9.1-screenshots/`; the five Store candidates are copied into `release/chrysalis-0.9.1-store-preparation/screenshots/`. The introduction now explains that playback pauses until dismissal/Start and timing starts only after Start. Recapture this changed surface from the actual package. No toolbar click is required to initialize the extension.

The files beside this README are historical captures; do not submit them as 0.9.1. The 0.9.0 release captures remain preserved separately.

# Real screenshot provenance

Captured with `npm run screenshots` from the verified ZIP-extracted extension in
Chromium 153.0.8010.12, using a disposable profile and real signed-out YouTube.
No page replacement, fake app mockups, seeded duration/history, or participant data.
The current session ran for a real foreground minute to trigger the photographed
checkpoint. Target revisions, continuation, break, Finish and Skip used working UI.

| File | Actual surface | Intended use |
| --- | --- | --- |
| `01-viewing-settings.png` | Options viewing controls; Shorts hiding explicitly chosen | 1280×800 store candidate |
| `02-live-youtube-session.png` | Live signed-out Home with current session indicator | 1280×800 store candidate |
| `03-live-checkpoint.png` | Live target-crossing checkpoint after actual elapsed time | 1280×800 store candidate |
| `04-local-history.png` | The completed automated test session and its actual revisions/break/reflection absence | 1280×800 store candidate |
| `onboarding.png` | Real popup document opened as an extension page | 375px reference, not store size |
| `break-popup.png` | Actual voluntary break in that popup document | 375px reference, not store size |
| `reflection-popup.png` | Actual optional unanswered reflection | 375px reference, not store size |

`capture-report.json` records package version, browser, timestamp, sizes, descriptions
and SHA-256 hashes. These screenshots show functioning interfaces, not interviews,
usage statistics, benefits or proof of native toolbar operation. The empty Home
layout does not demonstrate populated-Home hiding. No screenshots are in the runtime
ZIP. No asset has been uploaded to the Chrome Web Store.

Re-capture after UI changes with `npm run package` followed by `npm run screenshots`.
Live network/layout failures may stop capture; do not replace a failed live shot with
a fixture and label it live. Final publisher review of branding, rights and framing
is still required. `../artwork/promo-440x280.png` is a brand tile, not a screenshot.
