# Chrysalis Chrome extension — implementation status

Updated: 2026-09-07 · Extension 0.3.0 · Branch `main`

## Current stage

Reversible viewing controls implemented on the existing session system and
additive Manifest V3 foundation in `extension/`.
The [transition plan](youtube-extension-transition.md) retains the repository audit.
Existing React/Python/Flutter applications, databases and deployments are untouched.

## Completed

- Three independent saved controls, default off: supported Home recommendation
  cards/shelves, watch related-video cards/shelves, and Shorts shelves/navigation
  entry points. Popup disclosure and settings explain exact scope. Restore ordinary
  layout disables all three across tabs without changing session/display preferences.
- Isolated YouTube adapter, reversible CSS, scoped routes/positive card shapes and
  protected-content exclusions. Unknown structures stay visible. Per-page status
  reports no supported match or partial recognized coverage without claiming URL
  blocking or algorithm changes.
- CSS handles dynamic content; one filtered observer coalesces support checks with
  bounded record inspection. Disable/dispose removes style/status/owned attribute,
  observer and listeners. Suspension ignores late replies until pageshow, preventing
  controls from remounting after cleanup. Repeated initialization remains singular.

- Popup and settings support Studying, Watching a specific video, Entertainment,
  Exploring, or a short custom intention; optional preset/custom time targets and
  an explicit No time target option. Custom durations require whole minutes, 1–1440.
- Editable intentions/targets preserve the original target separately. Explicit
  idle, active, paused, checkpoint, break and finished states; neutral checkpoint
  choices, voluntary breaks, pause/resume and one saved summary per Finish.
- One authoritative worker timeline counts foreground desktop YouTube browsing
  and playback. Chrome tab/window eligibility, document visibility and one owner
  prevent concurrent tabs from adding time. Pauses and breaks exclude time.
- Serialized persisted mutations, revision/session-ID checks and bounded request
  receipts handle concurrent contexts, repeated commands and stale drafts.
- Timestamp observations and lifecycle boundaries handle navigation, refresh, tab
  closure and worker suspension. Unfinished sessions restore paused after browser
  restart. Long unexplained intervals are discarded and pause for recovery.
- Compact removable indicator shows sanitized session timing/state, without the
  intention or history. No duplicate indicator on repeated initialization.
- Foundation: independent TypeScript/HTML/CSS package, esbuild, no runtime
  dependencies; persistent appearance/indicator settings, local branding/fonts,
  strict message/sender validation, trusted-context storage and loadable `dist/`.

## Decisions and product contract

Desktop YouTube and user agency remain the scope: entertainment/exploration and
longer sessions are valid choices. No feed, coach, accounts, cloud sync, mobile
integration, fabricated research or mental-health claims were added.

- Only `storage` permission and top-frame static access to
  `https://www.youtube.com/*`; no backend, OAuth, API keys or broad page access.
- Foreground YouTube time includes browsing and paused playback, and excludes
  hidden tabs/unfocused windows. It is not exact watch time, attention or productivity.
- Visible documents send observations roughly every 2 seconds. One timestamp
  anchor is persisted; no background interval is the source of truth. Gaps over
  5 seconds, backwards clocks or inconsistent clock signals trigger recovery.
  Short lifecycle tails may be credited; handoffs and discarded gaps can undercount.
- Checkpoint continues counting eligible foreground time and acknowledges its
  target once. Changed targets rearm it; intention-only edits do not. Targets are
  total-session targets. Break expiry/early end leaves the session paused.
- Schema 3 locally upgrades valid extension schema-1/2 records, preserving settings
  and reserved records; unknown/corrupt data remains untouched. No legacy app
  database or user data is accessed or migrated.
- Local snapshot contains plans, measured durations/dates, latest 100 summaries,
  bounded command receipts and internal tab/window/document ownership metadata.
  No video URLs/titles, searches, account IDs or telemetry. Internal ownership
  clears on restart/finish; content receives no private plan/history. Incognito
  remains disabled. Uninstall removes extension-local data.
- Viewing controls hide recognized items rather than entire mixed containers to
  preserve ads, player content, playlists and unfamiliar items. This can leave gaps
  or remaining content. Shorts control does not block direct URLs or hide search and
  subscription shelves. Live versus fixture support is explicitly recorded below.
- Provisional later-stage choices: reflection/history management and separate
  Clear history/Delete all controls must cover command receipts as well as summaries.
  A future extension-wide pause must restore hidden sections and suppress prompts.

Allowed transitions, reconciliation thresholds, persistence and loss limits are
specified in [the session model](../extension/SESSION_MODEL.md).

## Validation

- `npm run check`: **35 Node tests passed**, strict TypeScript, production build
  and generated references/PNG/permissions/CSP checks passed. Includes schema-2
  preservation, default-off controls, independent writes/restoration, stale messages,
  validation and route exclusions, plus existing session/storage/protocol coverage.
- `npm run test:browser`: all three suites passed with the actual unpacked
  extension in Playwright Chromium **153.0.8010.12**, disposable profiles. Foundation/session suites exercise settings persistence, security,
  worker stop/wake, timing/focus, edits, checkpoints/breaks, finish and browser restart.
  Viewing fixtures exercise popup reopening, two-tab updates, late content, original
  node restoration, ad-bearing/unknown cards, real fixture media playback, search/
  subscriptions/playlists/direct Shorts routes, support status, singular observer,
  suspension/late replies and complete restore cleanup. Dark/light layouts inspected.
- Separate **live YouTube** verification: current watch recommendation cards,
  watch Shorts shelf and expanded English Shorts sidebar entry hide and restore;
  actual video time advances with hiding enabled. Native SPA search/subscriptions
  navigation remains usable; restore-all works afterward. One earlier playback run
  stalled; the live test now checks a baseline before testing playback with controls.
- **Fixture-only:** populated Home cards/shelves, mini guide, legacy compact cards,
  playlist queue/live chat/ad-bearing card preservation. The signed-out live Home
  supplied only an empty-feed prompt; it stays visible and reports no supported items.
  Authenticated subscription content, non-English href-less navigation and unknown
  YouTube experiments are not claimed as verified support.
- Reports/screenshots: ignored `extension/test-results/`, including separate
  `viewing-fixture-report.json` and `viewing-live-report.json`.
- Unperformed: native installed-Chrome toolbar popover, screen readers, oldest
  Chrome 111, physical OS sleep/shutdown, signed-in account flows, exhaustive real
  ads/caption rendering/playlist playback/fullscreen/theater/miniplayer layouts.
  Popup HTML is tested as an extension page; browser restart and clock gaps have
  their previously documented browser/injected-clock coverage.

## Try it and next stage

From `extension/`: `npm ci`, then `npm run check`. Load unpacked
`/Users/elaine/Documents/Chrysalis/extension/dist` at `chrome://extensions`, or Reload
an existing installation, then refresh YouTube. Start a session in the popup;
switch tabs/windows, edit or pause, and Finish to inspect original/final targets.
Expand Your viewing layout to try individual controls and Restore ordinary layout.
Scope/evidence/manual checks: [viewing controls](../extension/VIEWING_CONTROLS.md).
Exact commands, permission rationale and manual checks: [README](../extension/README.md).

Follow the next prompt's scope. Optional reflection, history browsing/deletion UI
and extension-wide pause remain incomplete. Broader/live Home selector verification
and distribution checks remain outstanding. Current session pause, checkpoints/breaks and local summary storage are implemented.

Known limits: conservative timing can undercount; interrupted writes may lose the
last unsaved observation. Short interruptions may be indistinguishable from normal
use. Break deadlines depend on wall time and reconcile on the next event/read.
Extension reload/disable can leave old injected UI until the page refreshes.
Dedicated small/store icon exports remain a distribution task. No deployment made.
