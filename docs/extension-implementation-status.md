# Chrysalis Chrome extension — implementation status

Updated: 2026-09-07 PDT · Extension **0.7.2** · Branch `main`

## Current stage

Usability, visual and functional review of `7f98c69faa8c6210d530cee86e26d3919a8a84fa`
completed with focused fixes and production packaging. Current changes are uncommitted.
Earlier applications, data and the original root review document are preserved.
YouTube-only; no Instagram, backend, accounts, analytics, migrations or publication.

## Completed features

- Skippable introduction; session setup/editing with optional targets, custom intentions,
  entertainment/exploration presets and unrestricted defaults.
- One authoritative serialized foreground timeline, native tab/window boundaries,
  persisted revisions/receipts, restart recovery and conservative gap handling.
- Independent reversible Home/related/Shorts-entry controls; unfamiliar layouts fail
  open. In-flow indicator outside the player, collapsed state and fullscreen hiding.
- One checkpoint per target; add time, untimed continuation, dismiss, finish or break.
  Dismissal keeps the target; explicit target revisions rearm. Disabled prompts retain
  timing. Break countdown uses wall time and expires paused, including after restart.
- Optional one-time reflection (Yes/Partly/No/Skip); notes; real local history with
  original/revised targets, foreground time and separate break time. No scores.
- Delete one, clear history and separate reset-all; updates propagate and stale saves
  cannot recreate records. Extension-wide pause restores layout and stops timing.
- Local fonts/butterfly branding, light/dark themes, focus states, reduced-motion
  support and quiet timer updates. README/privacy/install/pilot materials maintained.

## This review's fixes

- Actual native action popup no longer collapses to 62px in Chrome auto-sizing;
  measured 390px width. Responsive ordinary extension windows remain supported.
- High-zoom YouTube columns no longer clip the dock horizontally. Shared placement
  bounds only extension-owned width/margin; no host/player modifications.
- Collapsed indicator retains phase/checkpoint status and break countdown without
  forcing expansion. Existing Take a break action was retained, not newly invented.
- Session-specific Pause/Resume/Finish labels explain effects on timing and summaries.
- Read recovery clears its own error; successful polling retains unrelated validation
  errors. Existing stale-operation safeguards are preserved.
- Session-first popup, clearer navigation spacing, focused edit form, compact timer
  explanation and better-spaced break controls.
- Viewing preferences opens/focuses `options.html#viewing`; restore instructions give
  the full path. Message destinations remain a strict local enum.
- Unchanged targets display once; stored originals and explicit revisions remain intact.
  History-delete cancellation restores focus to its invoking button when possible.

## Measurement and privacy contract (unchanged)

- MV3, TypeScript/HTML/CSS/esbuild, no runtime dependencies. `storage` only; isolated
  static top-frame access to `https://www.youtube.com/*`. No API key or remote service.
- Foreground YouTube time includes browsing/playback only in the active tab of the
  focused window. Excludes hidden/unfocused tabs, pauses and breaks. About two-second
  observations; gaps over five seconds are discarded and may require Resume. Not exact
  watch time, attention or productivity. No background interval as the source of truth.
- Schema **6** preserves valid earlier schemas; missing old revision/break data remains
  marked incomplete. Unknown/corrupt data is preserved with an error, not silently reset.
- Latest **100 summaries**, **100 target revisions** each with omitted counts;
  intentions max 80 characters, notes max 500; no age expiry. Local, no app encryption.
- No video titles/URLs/searches/transcripts/account identities, telemetry, remote logs,
  cloud sync or export. Page structure is accessed for controls without storing browsing
  history. Expanded intention is visible on YouTube; reflections/history remain in trusted
  extension pages. No newly requested permissions or unsafe user-text HTML insertion.

## Validation and artifacts

- Baseline checks first: **63 Node tests**, typecheck/build and all **7** existing
  extension-enabled browser suites passed.
- Current checks: **65 Node tests**, strict TypeScript, production build, 17-file
  allowlist/14 local references. New fixture/native-popup regressions cover corrected
  geometry, compact phases, read/validation separation, deep links and focus.
- Real Chromium **153.0.8010.12**, disposable profiles: lifecycle suites exercise
  tab/window changes, worker termination/restart, browser relaunch, renderer signal gaps,
  storage faults, deletion barriers and actual Extensions-page Reload/Disable cleanup.
- Live signed-out YouTube: related/Shorts hiding and restoration, actual video progress
  with related hiding, SPA search/subscriptions, standard/theater/fullscreen, one-minute
  checkpoint and untimed continuation, theme mismatch, narrow 200% zoom, direct Shorts,
  refresh/back/forward. Populated Home remains fixture-only. A later live break/playback
  check was blocked by YouTube's pre-existing playback error; fixture break tests pass.
- Actual action-popup target captured/tested (390×498), distinct from extension pages
  in tabs. Physical toolbar positioning and human screen-reader behavior remain manual.
- Before/after screenshots and reports: `screenshots/chrysalis-usability/`. No static
  preview or mock browser API is substituted for live/native extension evidence.
- Version **0.7.2** build: `extension/dist/`; ZIP and unpacked directory:
  `extension/release/chrysalis-0.7.2.zip`, `extension/release/chrysalis-0.7.2-unpacked/`.
  Reproducibility checks and all nine suites on extracted bytes are documented in
  `extension/release/chrysalis-0.7.2-validation.json`. Previous 0.7.1 archives/screenshots
  remain historical; they exclude these fixes. No external distribution performed.

## Try it and next stage

From `extension/`: `npm ci`, `npm run check`, `npm run test:usability`,
`npm run test:package`. Load `extension/dist/` or the 0.7.2 unpacked folder via
`chrome://extensions` → Developer mode → Load unpacked. Reload an existing installation
instead of adding a second copy; refresh YouTube. Use a disposable profile for test data.

Personal testing is supported. A small, supervised **YouTube usability pilot is
conditional on participant-environment preflight**; this is not broad-release or Store
readiness. Remaining checks, by impact: actual populated/signed-in/experimental layouts
and media variants; physical sleep/wake; screen readers/physical toolbar interaction;
older Chrome and non-English navigation. Optional forms still scroll vertically.
Store preparation blockers from the previous stage remain; no Store submission here.

Next: complete that manual preflight and collect voluntary feedback without telemetry
or required viewing-history/note disclosure. Detailed findings/evidence/test matrix:
[usability review](chrysalis-usability-review.md). Existing contracts:
[timing](../extension/SESSION_MODEL.md), [viewing](../extension/VIEWING_CONTROLS.md),
[history](../extension/HISTORY.md), [installation](../extension/INSTALL.md),
[pilot guide](../extension/pilot/GUIDE.md), [transition audit](youtube-extension-transition.md).
