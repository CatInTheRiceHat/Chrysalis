# Chrysalis — current implementation

Release **0.8.0**, extension storage schema **7**. Desktop `www.youtube.com` in
Chrome only. No Instagram, account, cloud sync, telemetry or API dependency.
The original feed application is preserved, outside the active public-site build.

## Implemented experience

- One centered introduction per foreground visit. A visit renews roughly every
  15 seconds of foreground YouTube use; 30 minutes away permits a new visit.
  Refresh, SPA navigation, additional tabs and worker suspension share the claim.
  Unfinished sessions suppress introductions across browser restart as well. Early focus
  waits for display state before claiming an introduction, preventing a missed first offer.
- Optional intention; 5/15/30/60-minute and custom targets. Close, Escape or Continue
  without a timer starts no session/history. Untimed sessions are available in the popup.
- Compact side timer with hide/restore, expand, pause/resume, finish and viewing settings.
  Narrow, theater and fullscreen views initially use the restore tab. Hiding never
  stops timing. Centered check-ins remain dismissible, including in fullscreen.
- Target expiry offers more time, untimed continuation, dismissal, finish or break.
  Timing and playback continue while deciding. A break stops session timing, not media;
  deadline expiry remains paused. Targets are not lockouts or scores.
- Independent reversible Home/related/Shorts-entry controls, initially off. Unknown
  layouts remain visible; direct Shorts still work. Pause Chrysalis restores layout.
- Latest 100 local summaries, optional reflections/notes, explicit target revisions,
  delete one, clear history and separate reset-all. Content cannot read private history.
- Native dialogs, trusted gestures, Tab/Shift+Tab containment, Escape and focus restoration;
  local light/dark styles, reduced motion, popup/settings and keyboard controls.

Foreground time includes browsing/playback in the active YouTube tab of the focused
window. Hidden/unfocused tabs, manual pauses and breaks do not accrue. About two-second
observations; gaps over five seconds can be excluded and require Resume. This is not
attention, productivity or precise watch time. No background wall-time extrapolation.

Schema 7 preserves valid earlier schemas, including populated history/reflections and
existing collapse preference, and enables the new automatic-introduction setting.
Unknown/corrupt/future data is preserved with an error. Do not downgrade a schema-7
installation to an older release as recovery. Installation ID/path continuity matters.

## Release verification

Use the release evidence record `docs/extension-public-site-transition.md` and generated
`extension/release/chrysalis-0.8.0-validation.json` for completed checks. The build manifest
records the source revision, source-file digest, per-file artifact hashes and ZIP SHA-256.
The validation record is bound to those exact extracted bytes. All ten browser suites,
including `integrated-browser`, are part of package acceptance.

Current source checks: 71 unit tests and strict TypeScript/build. Browser tests load real
extension contexts in disposable Chromium profiles. Fixture tests and live-site evidence
are distinct. Historical 0.7.x reports/screenshots remain preserved, not current proof.
Browser/public-site artifacts are generated under ignored test-results directories.

Minimum declared Chrome is 111; tested Chromium is 153.0.8010.12. Older Chrome,
physical sleep/wake, physical toolbar positioning, human screen readers, non-English
and signed-in/experimental layouts still need targeted manual checks. No broad usability
or behavioral-outcome claim is made.

## Public website and retirement

`public-site/` builds independently with overview, installation, privacy, contact and
legacy notices. Public GitHub Issues was verified reachable; the existing repository
email is reused with no promise of delivery/response time. No fictitious Store listing,
download or survey is included. Privacy copies are generated from `extension/PRIVACY.md`.

Root Vercel now targets this site while retaining existing Python API routes/crons.
GitHub ingestion is unchanged. Production cutover replaces old auth/study UI with notices;
review users/participants before deploying. `deployment/retire-legacy-services.patch` is
unapplied. No services, auth, production data or public deployments were changed.

Baseline recovery: `legacy-web-baseline-2026-09-07` at
`5228d0df5e983b46e57f4e403450c976a4fc81f0`, plus verified Git bundle/LFS backup.
See `docs/legacy/README.md` and `deployment/README.md`.
