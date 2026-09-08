# Chrysalis — desktop YouTube, on your terms

The integrated YouTube introduction, floating timer, and check-in behavior are
documented in [YouTube sessions](YOUTUBE_SESSION.md), including timing rules and
browser verification commands.

Chrysalis is an independent Chrome extension for `https://www.youtube.com`.
It is not affiliated with or endorsed by YouTube or Google.

Choose an intention, optionally choose a time target, and revise either whenever you
want. Notice **foreground YouTube time**; pause, continue, take a voluntary break or
finish. Optional reflection and local history help you review your own choices,
without a score. Entertainment and exploration are valid intentions.

Optional controls hide recognized Home recommendations, related-video recommendations
beside watch pages, and supported Shorts shelves/navigation. All start off. They do
not block all Shorts URLs, change YouTube's algorithm, block ads or control playback.

## Install the prepared files

No server, account, API key, Node or Python is needed to use the prepared extension.

1. Extract `release/chrysalis-0.9.0.zip` into a permanent folder. Do not run files
   from inside the ZIP. The folder you select must contain `manifest.json` directly.
2. Open `chrome://extensions` in desktop Chrome. Turn **Developer mode** on.
3. Choose **Load unpacked**, then select the extracted folder. Pin Chrysalis from
   Chrome's Extensions menu and open its popup. Setup is skippable.
4. Open or refresh `https://www.youtube.com/`. Start a session when you choose.
   Settings → Viewing controls contains the optional layout choices.

In this workspace you can load either `extension/dist/` or the verified extracted
folder `extension/release/chrysalis-0.9.0-unpacked/`. Existing `dist/` users should
reload that installation rather than adding a second copy. Keep installation folders
in place; refresh YouTube after an update. Keep Developer mode on for unpacked use.

## Build the same package

From the repository root, with Node/npm (`.nvmrc`: Node 20.17.0; verified npm 10.8.2)
and Python 3 for ZIP packaging:

```sh
cd extension
npm ci
npm run check
npm run package
```

`check`: focused unit tests, TypeScript, production build and manifest/asset checks.
`package`: production build, deterministic ZIP, extracted loadable directory,
per-file SHA-256 manifest and archive checksum in `release/`. Exact reproducibility,
validation, update and installation instructions: [INSTALL](INSTALL.md).

```sh
npx playwright install chromium
npm run test:package   # two identical builds, package guards, browser suites on extracted ZIP
npm run screenshots   # actual extension/live YouTube captures; allow about two minutes
```

## Supported features and practical limits

- One shared session across desktop YouTube tabs. Counts browsing and playback only
  in the active tab of the focused window; excludes hidden/unfocused tabs, pauses
  and breaks. It cannot measure attention or exact video watch time.
- Optional targets, neutral checkpoints, extra time, untimed continuation and
  voluntary breaks. Break expiry stays paused. No playback interruption.
- Reversible controls, automatic session introductions and a compact floating timer.
  Theater/fullscreen and small windows use a restore tab; check-ins stay centered.
  Unfamiliar layouts stay usable; some content may remain. Populated/signed-in Home
  and many experimental/non-English variants need further live verification.
- Local history: latest 100 sessions, up to 100 explicit target revisions per
  session, optional notes up to 500 characters; delete one, clear history or reset all.
- Pause Chrysalis restores the ordinary layout and stops timing. Enable restores
  saved controls; Resume is a separate choice. A running break ends when paused.
- About two-second observations; missing signals over five seconds can discard time
  and require Resume. Browser restart clears unfinished sessions and temporary history.
- Desktop Chrome only; no native mobile YouTube, other browsers promised, incognito,
  accounts, sync, telemetry, AI coach or social feed. Minimum manifest version is
  Chrome 114, but validation uses Chromium 153; older versions remain unverified.

## Privacy, help and pilot

Plans and reflections stay in browser memory by default; optional completed history is encrypted on disk. Non-personal preferences persist locally. Chrysalis inspects
page structure without recording video URLs, titles, searches or account identities.
There is no upload or analytics. Your current intention can be read by YouTube when
displayed in its page. Only optional encrypted history needs unlocking; the timer and viewing controls work without a password.
[Full privacy explanation](PRIVACY.md) is also available offline through settings.

See [troubleshooting](INSTALL.md#troubleshooting), [voluntary pilot guide](pilot/GUIDE.md),
[optional feedback questions](pilot/FEEDBACK.md), and [case-study outline](pilot/CASE_STUDY.md).
No feedback is sent automatically and viewing history/personal notes are not required.

**Personal-installation package verified; pilot materials prepared.** A volunteer
launch remains conditional on the preflight checks in the guide. This is not a
Chrome Web Store release or an approval claim. [Distribution status](distribution/STATUS.md)
records actual checks and blockers; [store draft](distribution/STORE_DRAFT.md) contains
unsubmitted listing and policy materials.

The original React/Python/Flutter applications remain independent. Technical contracts:
[session model](SESSION_MODEL.md), [viewing adapter](VIEWING_CONTROLS.md),
[history](HISTORY.md), [experience](EXPERIENCE.md), [hardening evidence](HARDENING.md).

## Current release: 0.9.0

The centered YouTube introduction, compact side timer and check-ins are included in
all eleven packaged browser suites. Earlier plaintext needs an explicit encrypt/delete choice; settings are preserved.
The public website is independent in `public-site/`; old applications remain preserved
at `legacy-web-baseline-2026-09-07`. Their deployed services are a separate decision.

Current evidence supersedes historical runtime behavior in 0.7.x and 0.8.0 reports. The verified 0.8.0 ZIP/tag remains preserved. Exact source identity and
ZIP digest are recorded in `release/chrysalis-0.9.0-build-manifest.json` and the
matching validation file. See [current status](../docs/extension-implementation-status.md).
