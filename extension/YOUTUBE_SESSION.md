# Integrated YouTube sessions

The extension now offers a session introduction directly on desktop YouTube. It
uses the existing local session store, popup, viewing controls and cream/plum
palette. No permissions, analytics, network requests, backend dependencies or
recommendation algorithms were added.

## Arrival and dismissal

- New installations enable **Introduce new YouTube sessions**. Existing settings
  migrate to schema 7 with this option enabled; all existing choices and session
  data, including the collapse preference, are preserved.
- Only the foreground YouTube document can claim an automatic introduction.
  The worker serializes claims and stores visit metadata in `chrome.storage.session`.
  Refreshes, SPA navigation, additional tabs and worker suspension do not create
  another prompt. An unfinished session (including manual pause or break) always
  suppresses new introductions.
- A new visit begins after at least 30 minutes without foreground YouTube use.
  Foreground pages renew this visit approximately every 15 seconds, independently
  of session timing. Browser restart clears visit metadata; an unfinished saved
  session still suppresses introductions and follows existing recovery rules.
- Close, Escape and **Continue without a timer** dismiss the introduction and
  start no timer or history record. The popup remains available to start later.
- The form offers 5, 15, 30 and 60 minutes plus custom whole minutes (1–1440).
  It uses the saved default duration, or 15 minutes when no default is set.
  Intention text is optional; an empty intention uses the neutral “Your session”.
  Plans and history remain in existing restricted local extension storage.

## Timing and control

The existing timing contract is unchanged: elapsed time measures browsing and
watching on a visible, active YouTube tab in the focused, non-minimized Chrome
window. It is not video watch time or inferred attention. One persisted anchor
owns the timeline across all tabs. Content observations arrive about every two
seconds, and Chrome tab/window boundaries settle eligible short intervals.

Automatic time away clears the anchor and resumes accrual on return. **Pause**
requires an explicit Resume. A browser restart or an unreliable signal gap over
five seconds restores the session paused, excludes the uncertain interval and
explains recovery in the expanded timer and popup. Worker suspension alone does
not reset elapsed time. Uncertain gaps are never extrapolated from wall-clock
start time. The displayed remaining time changes only when saved observations
arrive; there is no separate page countdown that can drift or accelerate.

The compact widget shows remaining time (elapsed time for untimed popup sessions),
status, expand, pause/resume, finish and hide. The expanded view keeps the intention,
recovery explanation, breaks, editing and existing viewing-control states available.
Its Viewing controls button opens the existing settings section for Home
recommendations, related videos and Shorts entries. There is no existing autoplay
control to expose.

Hide leaves a keyboard-accessible Chrysalis tab and does not change session state.
Minimize/expand choices last for that document; refresh uses the saved display
preferences. The session itself always persists. Small windows, theater mode and
fullscreen use the restore tab by default, preserving space around the player.
Explicit restoration opens the panel within viewport bounds, with internal
scrolling on small screens. There is no dragging or position persistence. The
native extension popup also shows the current session, even if its welcome page
has not previously been dismissed.

## Check-ins and accessibility

A quiet text warning appears during the final minute or final 20% of the target,
whichever is shorter. At the limit, one foreground tab claims a centered check-in
for that target revision. Choices reuse the popup's validated controls: take a
break, finish, add a chosen duration, continue untimed, or dismiss. Time keeps
counting while deciding. Extension starts additional time from the measured
decision point, and rearms a check-in. Dismissal does not revise the target and
does not automatically interrupt again. Breaks use wall-clock deadlines and end
paused; they do not close tabs or stop video playback.

Dialogs use native modal inertness, explicit Tab/Shift+Tab containment, Escape,
labels and focus restoration. Styles live in shadow roots, support the extension
and YouTube dark themes and reduced motion, and make no font/CDN requests. Text
from people is inserted with textContent/value. Privileged page actions require
trusted gestures; arbitrary content settings/history access remains forbidden.
The floating widget needs no new page mutation observer.

## Verification

Run from `extension/`:

```sh
npm run check
npm run test:integrated
npm run test:integrated:live
```

The integrated suite loads the actual unpacked extension in a temporary Chromium
profile. Its default run uses controlled YouTube-origin fixtures; `--live` uses
signed-out public YouTube. Near-target elapsed values are seeded in the test
profile, then real observations perform the crossing. Reports and screenshots
are written under `test-results/integrated-*`.

Both modes passed arrival, dismissal/focus, start, refresh, multiple tabs, time
away, manual pause, hide/restore, popup synchronization, dark/narrow layouts,
extension, break and finish. The fixture run additionally exercises SPA navigation,
theater mode, native fullscreen and real 200% Chrome zoom. Unit tests cover concurrent
prompt claims, worker recreation, visit renewal, persistence failure, disabled
settings, target revisions and migration, alongside existing timing/state tests.
The separate native-popup regression also passed API-opened action popup start,
pause and persisted reopen using trusted CDP mouse input. Live signed-in variants,
physical screen readers, physical toolbar positioning, and live theater/fullscreen
usability remain unverified by the integrated suite; fixture geometry checks are
not a substitute for those usability checks.

## Implementation files

- Page UI: `src/content/index.ts`, `indicator.ts`, new `session-dialog.ts` and
  `surface.ts`. Player-only embed/chat documents retain popup access without
  receiving the session overlay.
- Prompt coordination: new `src/session/prompts.ts` and `src/background.ts`.
- Settings migration and messages: `src/shared/types.ts`, `validation.ts`,
  `protocol.ts` and `handler.ts`.
- Popup/settings integration: `src/ui/page.ts`, `src/ui/session.ts` and
  `static/options.html`.
- Verification: new `tests/prompts.test.ts` and `tests/integrated-browser.mjs`;
  updated existing browser assertions for floating/minimized placement and native
  dialogs, migration expectations, and optional usability-artifact output paths.
- Documentation and commands: `README.md`, `SESSION_MODEL.md`, `EXPERIENCE.md`,
  this file and `package.json`.

Final verification used Chromium 153: 70 unit tests passed, typecheck/build and
bundle validation passed, and all ten browser suites passed individually. These
include the integrated fixture suite and the existing foundation, session,
viewing, experience, checkpoints, history, hardening, usability and native-popup
suites. The additional integrated live YouTube suite also passed. Hardening covers
actual worker stops, browser restarts, renderer signal interruption, extension
reload/disable, bounded observers/writes and injected storage failure. No physical
OS sleep or screen-reader usability test is claimed.
