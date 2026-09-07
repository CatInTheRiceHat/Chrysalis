# Chrysalis Chrome extension — implementation status

Updated: 2026-09-07 · Extension 0.4.0 · Branch `main`

## Current stage

User-facing experience implemented on the working session/viewing foundation.
The additive `extension/` remains independent of the existing React/Python/Flutter
applications. Existing user commits and unrelated work are preserved; no database,
backend, legacy data or deployment changes were made.

## Completed

- Short first-use introduction explains desktop YouTube, optional planning and
  controls, local data and intention visibility. Get started/Skip dismiss it without
  changing viewing defaults or starting a session. Failed reads expose a usable retry.
- Session-first popup: start form when idle; live intention, foreground time,
  original/current target and working state-appropriate actions otherwise. Viewing
  preferences opens settings; appearance/indicator controls are secondary.
- Session setup/editing supports preset/custom intentions, optional validated
  targets and preference defaults. Original targets remain separate from revisions.
  Existing pause/resume/checkpoint/break/finish/summary behavior remains functional.
- In-flow YouTube indicator shows intention, committed foreground time, optional
  target and actions. Pause/resume/finish work directly; Edit opens a focused local
  extension window. Collapse/expand and dismissal work. It sits below the watch
  player and in Home's content grid beneath the sticky filter row; no floating
  overlay. Fullscreen hides it and the viewing-status disclosure; popup remains available.
- Settings group viewing controls, session preferences, checkpoints and data.
  New-session target and break defaults affect actual forms. Checkpoints can be
  disabled without stopping foreground accounting. Three viewing controls remain
  independently saved, default off, reversible through Restore ordinary layout.
- Real summary counts and confirmed Clear history/Delete all. History deletion
  removes summaries/receipts and a finished current record; unfinished sessions and
  preferences remain. Delete all stops/clears the session, resets preferences and
  clears open unsaved plan fields. Old queued messages cannot recreate deleted data.
- Existing brand reused: butterfly PNG, licensed local fonts, warm neutral/plum
  themes. Labels, focus styles, focus restoration, wrapping, native dialog/keyboard
  behavior and reduced-motion support. Timer updates have no live announcements;
  only changed phase text announces in the indicator.

## Decisions and boundaries

- Desktop `https://www.youtube.com/*` only; Manifest V3, TypeScript/HTML/CSS,
  esbuild, no runtime dependencies or new permissions. Only `storage` and the static
  top-frame YouTube match. No accounts, cloud sync, coach, custom feed, OAuth/API keys,
  analytics, mobile support, autoplay manipulation or ad blocking.
- Foreground time includes browsing/playback in one active tab in a focused window;
  excludes hidden tabs, unfocused windows, pauses and breaks. Timestamp/lifecycle
  accounting, 2-second observations, 5-second gap recovery and paused browser restart
  semantics are unchanged. It is not exact watch time, attention or productivity.
- **Privacy decision updated by this prompt:** current intention now appears on
  YouTube, as requested. Shadow DOM is not a privacy boundary; avoid private details
  and disable the indicator to remove its page UI. History remains extension-only.
  Content UI accepts trusted clicks for constrained session actions and fixed local
  surface opening; no webpage bridge, arbitrary plan edits or data-deletion access.
- Schema 4 upgrades valid extension schemas 1/2/3 without losing settings/plans.
  Unknown/corrupt saved data stays untouched. Deletion is serialized and checked
  against settings/session revisions; non-personal counters/epoch metadata and
  defaults remain to reject stale messages. No legacy app data is imported.
- One shared dock-placement observer plus an optional viewing-support observer;
  bounded batches/coalesced checks. Reinitialization/suspension cleans up both.
  Unknown layouts without a safe dock leave controls available in the popup.

Contracts: [experience](../extension/EXPERIENCE.md),
[session model](../extension/SESSION_MODEL.md),
[viewing support](../extension/VIEWING_CONTROLS.md),
[original repository audit](youtube-extension-transition.md).

## Validation

- `npm run check`: **40 Node tests**, strict TypeScript, production build and local
  manifest/assets/CSP/permission checks pass. Coverage includes checkpoint preferences,
  schema preservation, deletion atomicity/failure/stale writes and earlier timing,
  concurrency, sender and viewing-setting behavior.
- `npm run test:browser`: all four suites passed with the real unpacked extension
  in disposable Playwright Chromium **153.0.8010.12**:
  foundation, session, viewing and new experience suites exercise persistence,
  security, restart, toggles/restoration, introduction, preferences, long intentions,
  indicator actions, synthetic-click rejection, edit/focus restoration, fullscreen,
  light/dark UI, 375px settings, **actual Chrome tab zoom at 200%**, dialog Escape,
  data deletion and corrupt-data retry. A narrow-zoom overflow and editor-start focus
  race were found and fixed. Screenshots of actual extension surfaces inspected.
  Core text contrast pairs exceed 4.5:1; input boundaries exceed 3:1 in both themes.
- Separate **live signed-out YouTube**: Home/watch dock placement, intention/time,
  pause and collapse verified. Visual inspection found an initial Home placement
  partly under YouTube's sticky filter row; the dock now occupies a full content row.
  Watch placement is geometrically below the player. Prior-stage live checks cover
  watch recommendations/Shorts/sidebar, playback and search/subscriptions navigation.
- Populated Home hiding, mini guide and legacy card selectors remain fixture-only
  support claims; signed-in/experimental layouts are not presented as verified.
  Reports/screenshots are in ignored `extension/test-results/`, separated into
  fixture and live reports, including `experience-report.json` and
  `experience-live-report.json`.
- Manual checks remain: installed-Chrome native toolbar popover, physical screen
  readers, Chrome 111, signed-in flows, physical OS sleep and exhaustive real
  ads/captions/playlist/theater/miniplayer layouts. Fullscreen/zoom checks above use
  real browser behavior on controlled pages, not exhaustive YouTube layouts.

## Try it and next stage

From `extension/`: `npm ci`, then `npm run check`. Load/reload
`/Users/elaine/Documents/Chrysalis/extension/dist` in `chrome://extensions`, then
refresh YouTube. Open the popup, skip or read the introduction, and start a session.
Use Viewing preferences to adjust settings; try indicator pause/edit/finish and
collapse below a video. Exact commands/manual checks: [README](../extension/README.md).

Follow the next prompt's scope. Optional reflection, history browsing and an
extension-wide pause remain incomplete; session pause, summaries and deletion work.
Broader selector coverage, native-toolbar/screen-reader checks and store artwork
remain later work. Existing 100px icons are scaled by Chrome. Extension reload/disable
may leave stale injected UI until page refresh. No production deployment made.
