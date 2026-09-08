# Chrysalis Chrome extension — implementation status

Updated: 2026-09-07 · Extension 0.7.1 · Branch `main`

## Current stage

Production packaging, personal-installation instructions and volunteer pilot materials
prepared in the additive `extension/` package. Existing applications and earlier
uncommitted work were preserved. No telemetry, extra permissions, backend, database,
account, deployment, external publication or production-data changes.

## Completed product flow

- Skippable introduction, session-first popup, intention/custom intention and optional
  target setup/editing; no time target and ordinary YouTube layout are defaults.
- Authoritative serialized foreground timeline; native tab/window signals, persisted
  receipts/revisions, one counted tab, restart recovery and conservative gap handling.
- Independent reversible Home/related/Shorts controls. In-flow, collapsible session
  indicator outside the player; hides in fullscreen and on player-only embed pages.
- One checkpoint per armed target: additional time, untimed continuation, Finish or
  voluntary break. Dismissal leaves the target unchanged; explicit target revisions
  rearm. Disabled prompts retain timing. Break deadlines survive restart and expire
  paused; no automatic playback/session resumption.
- Optional one-time reflection offer: Yes/Partly/No, note or Skip (missing data).
  Real local history shows original/revised targets, foreground duration, separate
  break duration and reflection. Add/Edit/Cancel/Clear reflection work.
- Delete one, Clear history and separate Reset all; open views/drafts update and
  stale operations cannot recreate deleted summaries. Latest 100 summaries retained.
- Accessible labels/focus states, safe text rendering, responsive light/dark styles,
  reduced-motion support and timers without repeated live announcements.

## Hardening fixes

- Trusted options/popup sender checks accept document fragments, fixing settings
  mutations after section-link navigation while retaining origin/document checks.
- Extension-wide **Pause Chrysalis** restores layout, removes owned UI/observers,
  stops observations, pauses the session and ends a running break with its measured
  wall-clock total. Choices stay saved. Enable restores controls; Resume is separate.
  Both changes invalidate stale session commands. Edit/Finish remain available.
- Synthetic page visibility events no longer trigger timing observations.
- Visible old content contexts detect extension invalidation locally about every
  five seconds and clean up without worker messages. Reload/disable cleanup verified
  with actual `chrome://extensions` controls; refresh installs the updated script.
- Player-only `/embed` documents receive no dock. Unknown layouts remain usable.

## Distribution preparation

- Version 0.7.1 adds a linked offline privacy page, corrected version footer and
  standard 16/32/48/128px exports of the existing butterfly. No session/schema change.
- Strict 17-file build allowlist, deterministic ZIP metadata, extracted unpacked
  folder, SHA-256 checksums/inventory and ZIP-bound browser validation report.
  Only runtime assets and required font licenses ship; no tests/docs/user profiles.
- Two clean builds generated the identical 968,790-byte ZIP. All seven lifecycle
  suites passed again using its extracted contents; 63 Node tests/types/build pass.
- Seven actual screenshots captured, including a live one-minute checkpoint and
  the real automated session's history. Four are 1280×800 store candidates; three
  are raw popup-document references. These are engineering evidence, not research.
- README, exact install/update/troubleshooting guide, full privacy explanation,
  voluntary guide/questionnaire and a case-study outline with unfilled findings.
  Store listing, permission/privacy drafts, promotional tile and official-policy
  review prepared. Nothing submitted or sent to participants.

## Data and measurement decisions

- MV3, TypeScript/HTML/CSS/esbuild, no runtime dependencies. Only `storage` plus
  static top-frame `https://www.youtube.com/*` access; no extra permissions/services.
- Foreground YouTube time includes browsing/playback only in the active tab of the
  focused window. Excludes hidden/unfocused tabs, pauses and breaks. About two-second
  observations; gaps over five seconds are discarded and may require Resume.
  This is not exact watch time, attention or productivity. Breaks use wall-clock time.
- Schema **6** preserves valid schemas 1–5. Schema 5 gains the pause default without
  losing history. Older missing revision/break details stay explicitly incomplete.
  Unknown/corrupt data is preserved and errors shown; no silent repair/reset.
- Retention: latest **100 completed sessions**, latest **100 target revisions** each
  with omitted-entry counts; intentions max 80 characters, notes max 500. No age expiry.
- All data is local. No video titles/URLs/searches/transcripts/account IDs, analytics,
  remote logging, sync or export. Page structure is read for controls without storing
  browsing history. Current intention is visible in YouTube's DOM; notes/history stay
  in trusted extension pages. Local data has no Chrysalis encryption.

## Validation

- Existing checks ran first: **58 Node tests**, strict TypeScript, production build,
  generated manifest/assets/CSP/permission checks and all six original browser suites
  passed before fixes.
- After fixes: **63 Node tests**, strict TypeScript and production build pass. Added
  pause/break/stale-operation, fragment-sender, schema-5 preservation and write-bound
  tests. Existing target, concurrency, timing, retention/deletion and recovery tests pass.
- Seven real unpacked-extension browser suites pass in Chromium **153.0.8010.12**:
  foundation, session, viewing, experience, checkpoints, history and hardening. Coverage
  includes onboarding through deletion, native focus/tab changes, refresh, actual
  worker stop/wake, full browser restart, fullscreen, keyboard/focus and 200% zoom.
- Hardening browser checks verify trusted-storage denial from content, section-link
  saves, two-tab pause/cleanup, no writes while paused, injected Chrome write failure
  and retry, debugger-induced missing signals, and actual Extensions-page reload/disable.
  Six bounded snapshot writes across two visible test documents in 6.5 seconds despite
  1,000 synthetic visibility events; only one foreground owner counted. A batch of
  1,000 inserted nodes triggered two adapter document probes; pause left zero observers.
- Fresh live signed-out YouTube: related-video/Shorts hide/restore, actual video progress,
  player/caption controls, native SPA search/subscriptions, ordinary-layout restoration,
  and watch/Home indicator placement passed. Home was empty; populated Home remains
  fixture-only. No claim of exhaustive signed-in, captions, ad or layout coverage.
- Narrow dark popup screenshot visually inspected. Current reports/screenshots are in
  ignored `extension/test-results/`; no normal-web preview substituted for an extension.
- Source/package inspection found no remote-request code, dynamic untrusted HTML,
  exposed storage, unnecessary permissions or data-bearing debug logs. Known secret
  signature scan: no matches. `npm audit --json`: zero known vulnerabilities.

Exact commands, evidence boundaries, ranked limitations and a manual checklist:
[hardening report](../extension/HARDENING.md). Contracts:
[history](../extension/HISTORY.md), [experience](../extension/EXPERIENCE.md),
[timing](../extension/SESSION_MODEL.md), [viewing](../extension/VIEWING_CONTROLS.md),
[repository audit](youtube-extension-transition.md).

## Try it, readiness and next stage

From `extension/`: `npm ci`, `npm run check`, `npm run package`.
Load `extension/release/chrysalis-0.7.1-unpacked` in `chrome://extensions` with Developer
mode enabled, then refresh YouTube. Existing `extension/dist` users should reload
that same installation. ZIP: `extension/release/chrysalis-0.7.1.zip`.
`npm run test:package` verifies reproducibility and all seven suites on the extracted
ZIP. `npm run screenshots` captures real extension/live YouTube surfaces.

**Ready for personal installation; pilot materials prepared, volunteer launch
conditional on manual preflight. Not ready for Store submission.** Manual gaps:
native Chrome toolbar, intended populated/signed-in/experimental layouts, physical
sleep and screen readers, older Chrome and full ad/player variants. Store blockers:
hosted privacy/contact, publisher/account setup, final artwork/metadata review and
resolution of the official FAQ's at-rest encryption language for this unencrypted
local-storage design. Unpacked-to-Store data migration is not implemented.

Exact paths, checksums, validation, remaining blockers and official sources:
[distribution status](../extension/distribution/STATUS.md),
[installation](../extension/INSTALL.md), [store draft](../extension/distribution/STORE_DRAFT.md),
[pilot guide](../extension/pilot/GUIDE.md). Follow the next prompt's scope.
