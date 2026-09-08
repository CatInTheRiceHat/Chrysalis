# Product hardening — 0.7.0

Review date: 2026-09-07 (America/Los_Angeles). Scope: the additive desktop Chrome
extension. Existing applications, backend, databases and production resources were
left in place. No permissions, accounts or remote dependencies were added.

## Fixes

- Settings sender validation now accepts section fragments on the actual trusted
  popup/options documents. Navigating to `#viewing`, `#preferences`, `#checkpoints`
  or `#data` previously caused legitimate requests to be rejected. Other origins,
  documents, subframes and query-bearing URLs remain denied.
- Added a real extension-wide pause in popup/settings. It restores ordinary YouTube
  layout, removes owned UI and observers, stops foreground observations, ends a
  running break with its elapsed wall-clock total, and preserves preferences/history.
  Enable restores controls but does not resume the session. Stale commands cannot
  cross the pause/enable boundary. Schema 6 adds this default to valid schema 5 data
  without losing records; earlier supported schema upgrades remain covered.
- Synthetic webpage `visibilitychange` events cannot trigger timing observations.
- Player-only `/embed` documents cannot receive a potentially obstructing dock.
- Added a local context-invalidation check for old injected UI after reload/disable.
  This check does not message or keep the background worker alive. New scripts still
  need a page refresh after an extension update; no broad injection permission added.

## Security and privacy inspection

Manifest V3 requests only `storage`; the static isolated content script matches the
exact desktop origin `https://www.youtube.com/*`, top frame only. No external
messaging, web-accessible resources, OAuth, API keys, remote code, remote fonts or
runtime packages. Packaged scripts contain no fetch/XHR/WebSocket/beacon calls.
Extension-page CSP disallows network connections and remote executable code.

Incoming messages use exact shape validation and sender roles; content scripts may
request only the display and constrained session operations, never notes, history,
settings writes or deletion. Chrome storage is restricted to trusted extension
contexts on every worker read/write. DOM action handlers require trusted clicks;
there is no webpage `postMessage` bridge. Custom intentions/notes use text/form
assignments. `innerHTML` is limited to bundled static templates. Three background
error logs contain generic failure text, not session data or browsing information.

The generated package was scanned for common private-key, Google API, AWS, GitHub
and OpenAI-style token signatures: no matches. This is a bounded signature check,
not a guarantee that every possible secret format can be detected. `npm audit
--json` reported zero known vulnerabilities in the installed dependency tree.
No video URLs, titles, searches, transcripts or identities are stored. The current
intention is intentionally visible in YouTube's DOM; notes/history are not. Local
storage is not encrypted by Chrysalis. Retention remains 100 completed sessions and
100 explicit target revisions per session, with deletion race protection.

## Validation results

Commands run from `extension/`:

| Command | Actual result |
| --- | --- |
| `npm run check` before changes | 58 tests passed; TypeScript/build/assets/permissions passed |
| `npm run test:browser` before changes | All six existing suites passed |
| `npm run check` after changes | 63 tests passed; TypeScript and production verification passed |
| `npm run test:browser` after changes | All seven suites passed: foundation, session, viewing, experience, checkpoints, history, hardening |
| `node tests/hardening-browser.mjs` | Passed real extension pause, sender/storage denial, bounded writes/probes, missing signals, write failure/retry, reload and disable |
| `node tests/viewing-live.mjs` | Passed observed live surfaces; explicitly reported empty Home and other unverified layouts |
| `node tests/experience-live.mjs` | Passed live watch/Home placement, foreground time, Pause and collapse |
| `npm audit --json` | Zero known vulnerabilities |
| `git diff --check` (repository root) | Passed |

During test development, an overly strict write-count expectation was corrected for
two visible headless documents. A renderer freeze delivered a valid visibility
boundary, so missing-signal recovery was tested with debugger suspension instead.
Reload tests were corrected to enable Developer mode and reopen extension pages
that Chrome closes during reload. Without Developer mode, this Chromium build marks
the reloaded CLI-installed extension as unsupported and disables it. The documented
Load unpacked workflow already requires Developer mode. These harness failures were
investigated, not counted as successful checks.

Automated browser reports
and screenshots are generated under ignored `test-results/`. These use real unpacked
extension contexts in Chromium 153.0.8010.12; a regular web preview was not used as
extension proof. Fixture pages test lifecycle and DOM safety but do not establish
live YouTube selector support.

Fresh live, signed-out YouTube checks verified related-video and Shorts shelf
hide/restore, English Shorts guide hide/restore, actual video progress, preserved
player/caption controls, native search/subscriptions navigation without reloading,
restoring ordinary layout, and watch/Home indicator placement outside the player
and masthead. The signed-out Home feed was empty: populated Home selectors remain
fixture-only. Live caption text, all ad variants and account behavior were not
exhaustively exercised.

## Exact remaining manual checklist

Use a disposable Chrome profile for deletion/update/failure experiments. Do not
alter your everyday profile's storage to run these checks.

1. **Native install and toolbar:** `cd extension`, `npm ci`, `npm run check`.
   Open `chrome://extensions`, enable Developer mode, choose Load unpacked and
   select `extension/dist`. Pin Chrysalis and open it from the actual toolbar.
   Skip onboarding, close/reopen the popover, then reopen the introduction from
   settings. Confirm choices persist and every action is reachable when scrolled.
2. **End-to-end personal session:** choose a custom intention and no target. Visit
   two YouTube tabs, browse, play a video, switch tabs/windows, refresh and close
   the active tab. Only the focused active YouTube tab may count. Pause/resume;
   edit the target to one minute. At the checkpoint test Dismiss (same target,
   quiet indicator), then in separate sessions extra time, untimed continuation,
   finish, and a one-minute break. End one break early; let another expire. Expiry
   must remain paused. Finish, Skip reflection, then finish another and save an
   answer/note. Compare actual history fields; delete one, clear history, reset all.
3. **Signed-in layouts:** on a populated Home page toggle Home hiding off/on/off;
   preserve ads, search, navigation and empty-state prompts. On watch pages do the
   same for related videos, separately for Shorts shelves/navigation. Use browser
   Back/Forward and native search/subscription/playlist links without refreshing.
   Unsupported content must stay usable and be reported as unrecognized; direct
   Shorts URLs must still work. Repeat with your account/language/experimental UI.
4. **Player and access:** with controls active, verify captions, theater mode,
   miniplayer, fullscreen, ads, playlist queue and live chat. At the target while
   fullscreen, playback stays uninterrupted and the in-page dock stays hidden.
   Exit fullscreen: one pending checkpoint is available. Test keyboard-only use,
   Escape/cancel and focus restoration, 200%/400% zoom, a narrow window, long
   80-character intentions and 500-character notes in light/dark themes. Test a
   physical screen reader: time must not be announced every second.
5. **OS/browser lifecycle:** record elapsed time, put the computer physically to
   sleep for several minutes, wake it and inspect the recovery state. The gap
   must not become counted time. Also quit/reopen Chrome during active viewing
   (recover paused) and a break (retain deadline, expire paused). Renderer suspension
   tests are not proof of physical sleep behavior on every OS.
6. **Disable/update:** use Pause Chrysalis and verify ordinary layout/time stopped
   in every tab; enable and explicitly resume. Reload/update or disable the extension
   while a YouTube tab is hidden, frozen or discarded; return to it and verify old
   styles/UI clear. Refresh the page to install the new script. For an actual
   package-version update, preserve a disposable prior-version profile containing
   preferences, a revised target, break and reflection; update and verify all fields
   and safe unfinished-session recovery. Automated schema migration and Extensions-page
   reload are useful evidence but do not cover the Chrome Web Store update channel.
7. **Minimum version and failures:** repeat core flows in the oldest supported
   Chrome (111) if available. In a disposable profile only, verify quota/disk failure
   is reported without a false Saved result. Unknown/malformed snapshots must stay
   untouched, with retry available. Back up the disposable record before manual
   corruption. There is deliberately no silent reset or corruption repair routine.

## Practical limitations and readiness

1. **Highest impact — live layout breadth:** populated/signed-in Home, account and
   experimental/non-English layouts, all ads/captions/player modes remain partly
   unverified. Controls fail open; some recommendations may remain. Do not promise
   comprehensive Shorts blocking or complete recommendation hiding.
2. **Timing accuracy:** this is foreground YouTube time, not video watch time or
   attention. Two-second observations and five-second conservative gap recovery
   can undercount or require Resume under browser throttling. Physical OS sleep
   remains a manual check; wall-clock break duration is affected by clock changes.
3. **Lifecycle/accessibility breadth:** native installed-Chrome toolbar interaction,
   physical screen readers, Chrome 111 and distribution-channel updates remain
   unverified. Existing pages need refresh to receive updated content scripts.
4. **Data recovery:** corrupt/unknown data is preserved and errors are surfaced;
   no automatic repair is attempted. Local notes have no Chrysalis encryption,
   cloud backup or export. Generic storage failures have automated coverage, not
   real disk exhaustion on every OS.

**Suitable for supervised personal testing with these limits; not ready for a small
pilot or release claim.** Use the manual checklist before widening distribution.
