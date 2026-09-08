# Chrysalis extension usability and functional review

Reviewed on 2026-09-07 PDT (2026-09-08 UTC), against the user's extension brief and
existing warm plum/butterfly visual language. Baseline: `main`,
**`7f98c69faa8c6210d530cee86e26d3919a8a84fa`**, extension 0.7.1. The working tree was
clean immediately before this review's edits. This is newer than the earlier
`2e066210fc933d5b20c573cb50d0ceb542854a8d` review. The root
`Chrysalis-Usability-Review.md` is preserved as historical source-only evidence.
The reviewed fixes are uncommitted, version **0.7.2**; its packaged asset identity
is recorded below. No application/backend/database work or publication was done.

## Scope established from files

- `extension/static/manifest.json`: MV3; only `storage`; static isolated top-frame
  script on **https://www.youtube.com/**; incognito disabled; Chrome 111 minimum.
  **No Instagram integration** exists. Opening the popup over Instagram would not
  establish page support. No Instagram feature was added.
- `extension/src/content/youtube-adapter.ts`: recognized Home cards/shelves, watch
  recommendations and Shorts guide/shelf entries. Search/subscriptions remain
  available. Direct Shorts URLs work; the unfamiliar Shorts player layout has no
  injected dock. Unknown layouts and `/embed` retain popup access.
- `src/ui/{page,session,choices,reflection,history}.ts` and `static/{popup,options}.html`:
  introduction, optional session/target, editing, pause/finish, checkpoints, voluntary
  breaks, optional reflection, real local history, preferences, restoration/deletion.
- `src/session/model.ts`, `src/shared/{storage,protocol,validation}.ts`, `src/background.ts`:
  authoritative serialized state, original targets/revisions, foreground timing,
  bounded missing-signal recovery, durable checkpoints/breaks and schema migration.
- TypeScript/HTML/CSS/esbuild; no runtime dependency, account/API key, remote service,
  mobile or social feed required. Root `CLAUDE.md`/copilot instructions describe the
  preserved older applications; the extension brief governs this review.

## Evidence boundaries

**Live website with real extension:** disposable signed-out Chromium profiles, actual
YouTube responses. Home/watch, Shorts, native search/subscriptions navigation,
standard/theater/fullscreen, real one-minute target, theme mismatch, refresh and
back/forward. No authentication or restriction bypass.

**Controlled fixtures with real extension:** actual unpacked MV3 worker, isolated
content script, Chrome storage/tabs/windows and native lifecycle events. Fixtures
supply difficult Home/playlist/chat/ad layouts; some checkpoint tests seed elapsed
proximity, then use real observations. Storage faults are deliberately injected only
in disposable test contexts. These do not prove live selector support.

**Native toolbar popup:** Chrome's real action popup opened with `chrome.action.openPopup`,
attached to its actual DevTools target; trusted mouse input, screenshots and reopen
checked. It is not a `popup.html` tab masquerading as a toolbar check. Headless
Chromium does not establish physical toolbar placement/clicks on a user's desktop.
The [official action documentation](https://developer.chrome.com/docs/extensions/reference/api/action)
permits this test API in Chrome 127+; no API or new permission was added to the product
for testing. Actual browser: **Chromium 153.0.8010.12**.

**Static previews:** none used as functional evidence. Other popup-document screenshots
are actual extension pages in tabs, explicitly identified as such.
**Source inspection only:** exhaustive absence of Instagram/remote services,
manifest/security review, and behavior not exercised in the matrix below.

## Prioritized findings, reproduction and fixes

| Priority | Finding / reproduction / user impact | Change and evidence |
| --- | --- | --- |
| P1 | Open the actual action popup. `width:390px; max-width:100vw` fed Chrome's initial tiny viewport back into auto-sizing: observed **62px** width, words broken into single characters. Ordinary tab previews missed it. | `src/ui/page.ts`, `static/styles.css`: distinguish the no-tab action context and allow its intrinsic 390px width. Responsive ordinary extension windows remain unchanged. Actual popup skip/start/pause/reopen passes at **390×498** in this harness. |
| P1 | At 768px browser width/200% zoom in theater mode, YouTube's wide, left-offset `#below` column clipped the indicator's left edge. A width-only assertion initially missed this. | `src/content/dock.ts`: bound extension-owned width/margin to the viewport during existing placement passes. No host nodes/styles moved. Retested live and with a deliberately offset fixture; both edges visible. |
| P2 | Pause or reach a target, then collapse the indicator. Phase/quiet checkpoint were inside hidden details; elapsed time alone could imply an active session. | `src/content/indicator.ts`: stable phase status outside collapsible details; elapsed/countdown remain quiet. A pending checkpoint while already collapsed stays discoverable without forcing expansion. Collapsing an open checkpoint still dismisses it, keeps the target and leaves a quiet reached-target message. Keyboard focus stays on Expand/Collapse. |
| P2 | Inject a transient GET_SNAPSHOT error, then restore successful reads. Error and Refresh remained indefinitely. | `src/ui/session.ts`: track read errors separately from action/validation errors; successful reads clear only read failures. Invalid intentions survive polling. Command failures still require a deliberate refresh/review, retaining stale-state protections. |
| P2 | Idle popup placed a global pause panel and marketing heading before the form; Start fell at y≈596 in a 600px viewport. Editing left live controls above the editor. | Session-first hierarchy, auxiliary pause below primary flow, shorter plan hint, timer details disclosure, separated navigation links. Start now y≈384 in the same tab viewport. Edit hides the redundant live panel and restores focus on cancel/save. These are geometry observations, not evidence of changed user scrolling behavior. |
| P2 | “Pause” and “Finish” beside a video could sound like player controls. | “Pause session”, “Resume session”, “Finish session”; concise explanation that Pause stops timing and Finish saves a session, without controlling playback. Existing break action/countdown were already implemented; retained and revalidated. |
| P2 | “Viewing preferences” and “Open settings” opened the same top-level destination; restore instructions omitted navigation into settings. | Enumerated `OPEN_PAGE: viewing` opens `options.html#viewing` and focuses its heading. Restore hint names Chrysalis → Viewing preferences → Restore ordinary layout. Sender/enum validation remains restrictive. |
| P3 | Unchanged targets were printed twice in live/finished/history summaries. | One target when unchanged, explicit original/final when different. Stored original target and the entire explicit revision list remain unchanged, including revisions that return to the original target. |
| P3 | Cancelling one-history-item deletion returned to the page heading instead of the invoking button. | Restore focus to that session's Delete button when it still exists; heading fallback after removal. Browser regression added. |
| P3 | Popup break label, select and button crowded together. | Consistent grid/gaps and label above duration choices; reviewed in light/dark, long-text and native/tab surfaces. |

Main text/primary/status token contrast was calculated: light muted text **4.78:1**,
light primary **6.41:1**, dark muted **8.38:1**, indicator status **6.29:1 / 9.09:1**.
Control-border contrast **3.40:1 / 5.28:1**. This is not an accessibility certification.
Visible focus, long text and quiet timer markup were inspected; screen-reader output
still needs a human check. “Use device setting” intentionally follows the device,
independently of YouTube's chosen appearance. Both mismatch and explicit overrides
were tested; the README explains how to match them.

## Screenshot evidence

All images are real engineering captures, not participant findings. Public YouTube
content belongs to its respective owners. Fixture text is explicitly artificial.

| Experience | Before | After |
| --- | --- | --- |
| Actual action-popup sizing | [62px clipping](../screenshots/chrysalis-usability/before-native-sizing.png)¹ | [Native setup](../screenshots/chrysalis-usability/after-native-setup.png), [native active](../screenshots/chrysalis-usability/after-native-active.png) |
| Setup in 390px extension tab | [Before](../screenshots/chrysalis-usability/before-setup.png) | [After](../screenshots/chrysalis-usability/after-setup.png) |
| Long-intention editing | [Before](../screenshots/chrysalis-usability/before-edit.png) | [After](../screenshots/chrysalis-usability/after-edit.png) |
| Collapsed paused fixture | [Before](../screenshots/chrysalis-usability/before-collapsed-paused.png) | [After](../screenshots/chrysalis-usability/after-collapsed-paused.png) |
| Recovered read error | [Before](../screenshots/chrysalis-usability/before-read-recovered.png) | [After](../screenshots/chrysalis-usability/after-read-recovered.png) |
| Live theater at 200% zoom | [Clipped](../screenshots/chrysalis-usability/before-live-narrow-zoom.png) | [Corrected](../screenshots/chrysalis-usability/after-live-narrow-zoom.png) |
| Live watch | [Before](../screenshots/chrysalis-usability/before-live-watch.png) | [After](../screenshots/chrysalis-usability/after-live-watch.png) |

¹Captured after the first copy/layout edits but before the separate native sizing fix;
it is not claimed as an untouched-baseline native screenshot. Initial native capture
via Playwright's Page event timed out; direct attachment to Chrome's action target
then exposed the defect. Additional dark, break, checkpoint, fullscreen, Shorts and
zoom images/reports are in [the evidence directory](../screenshots/chrysalis-usability/).

## Test matrix

Pass means only the specified evidence/scope passed. It does not imply all accounts,
Chrome versions or YouTube experiments are covered.

| Experience / risk | Result | Evidence and bounds |
| --- | --- | --- |
| Build/unpacked installation/manifest references | Pass | Real extension loaded; 17 allowlisted assets, 14 local references. |
| Native action popup, skip/start/pause/reopen | Pass | Actual action target, 390px width, mouse input and persistent state. Physical toolbar click/placement not tested. |
| Onboarding, timed/untimed/custom plans, edit/save/cancel | Pass | Extension pages and native popup; no restrictive defaults. |
| Target revisions, original target, validation, concurrent/duplicate/stale messages | Pass | 65 Node tests plus session/choices browser suites. |
| Multiple tabs, focus/window changes, tab close/refresh | Pass | Real Chrome APIs/lifecycle on controlled YouTube fixtures; no simultaneous counting. |
| Worker stop/wake, full browser restart | Pass | Real worker termination and disposable-profile relaunch; paused/recoverable restoration. |
| Long gaps, malformed storage, updates, failed write/retry | Pass | Injected failure/corruption and debugger-suspended renderer; state preserved. Physical OS sleep not established. |
| Live signed-out empty Home | Pass | Empty prompt retained; no-supported-items status truthful. |
| Populated Home recommendations | Pass | **Fixtures only**; no populated Home was supplied live. |
| Live populated/signed-in Home and subscriptions | Blocked | No authenticated profile used; remains manual. |
| Each hide toggle, together, late insertion and restoration | Pass | Fixtures; live related cards/watch Shorts shelf/guide entries separately restored. |
| Search/subscriptions SPA navigation with all controls on | Pass | Actual signed-out YouTube UI, same-document navigation and visible results/prompt. |
| Direct Shorts page | Pass | Live observed Shorts link opens; unfamiliar player surface remains usable without dock. |
| Standard/theater and fullscreen | Pass | Live geometry; fullscreen hides dock and exit using YouTube's fullscreen button restores it. |
| Captions / playlist queue / chat / ads | Pass | Protected fixture nodes and live player/caption **controls** preserved. Real caption text, active ads, queue playback and live chat **not tested**. |
| Live miniplayer | Not tested | No visible miniplayer button supplied on the observed video. |
| Native back/forward/refresh, single mount | Pass | Live watch/Shorts navigation; fixture SPA/reinjection tests. |
| Target crossing, collapsed checkpoint, dismissal/rearming/continuation | Pass | Real one-minute live target plus seeded-proximity fixture tests; no forced expansion. |
| Break countdown, early ending/expiry, finish | Pass | Real extension fixtures incl. restart; measured time stops, expiry stays paused. |
| Live playback during recommendation hiding | Pass | Video time actually advanced with related hiding enabled. |
| Live playback throughout break after long checkpoint run | Blocked | YouTube showed “Something went wrong”; baseline already had paused=true, readyState=0, networkState=0 **before** break. Fixture playback passes. |
| Reflection Yes/Partly/No/Skip, notes, real history/deletion | Pass | Real stored sessions, no sample history; text rendered literally; deletion propagates/stale saves rejected. |
| Keyboard/focus, light/dark, long text, 375px settings, 200% zoom | Pass | Browser interaction/assertions and screenshots; native/tab/fixture/live categories above. |
| Screen reader, physical OS sleep, older Chrome | Not tested | Manual matrix below. |
| Extension pause, restore, Reload/Disable cleanup and bounded observers/writes | Pass | Actual Extensions-page actions + fixtures; no permanent worker assumptions. |
| Instagram | Not tested | Absent by design; no manifest access or adapter. |

Initial investigative failures remain in `initial-live-modes-report.json`: headless
Escape did not exit fullscreen (the real fullscreen button passed on retest), and
playback was asserted without first checking YouTube's error state. The retest adds
that prerequisite and records it **Blocked**, not passed. The first zoom assertion
checked width only; screenshot inspection exposed clipping, fixed and retested with
both viewport edges asserted. These are explicitly not hidden test successes.

## Commands and validation

From the repository root: `cd extension`. Existing installed dependencies were used
(Node **20.17.0**, npm **10.8.2**); `npm ci` is the documented clean install command,
not a command claimed to have run during this review.

- Before edits: `npm run check` — **63/63** tests, typecheck/build/asset validation;
  `npm run test:browser` — all **seven** existing suites passed.
- After fixes: `npm run check` — **65/65**, zero failures, strict TypeScript and
  production manifest/asset checks pass.
- `npm run test:usability` — fixture recovery/focus/compact phase/offset layout and
  actual native-popup checks pass. New bounded permission-enum and summary regressions
  are included in the 65 tests.
- `npm run test:package` — **passes**: deterministic rebuild, allowlist guards and
  all **nine** browser suites on ZIP-extracted bytes. [ZIP-bound validation](../screenshots/chrysalis-usability/validation/chrysalis-0.7.2-validation.json)
  records the final archive identity and successful suites.
- `node tests/experience-live.mjs`, `node tests/viewing-live.mjs` — signed-out results
  above; `node tests/usability-live.mjs` and `--layout-only` — detailed live mode/
  checkpoint run plus final placement retest. Live reports include blocked/not-tested
  observations and must not be interpreted as an all-pass exit code.
- `git diff --check` — passes. A test still expecting the old marketing heading failed
  during iteration; corrected to the implemented heading. An earlier package run was
  interrupted after the newly discovered zoom fix; only final validation applies.

Security reinspection: no added permissions; no external executable code, fetch,
XHR or telemetry integration; strict local CSP including `connect-src 'none'`.
`innerHTML` uses static bundled markup; intentions/notes use `textContent`/`value`.
Storage remains restricted to trusted contexts; content cannot read private summaries
or preferences directly. Generic worker error logs contain no user data. The only
new message destination is an enumerated local Viewing section, not a caller URL.
The unchanged timing/store code retains revision/receipt serialization, data deletion
barriers, schema 6 and the 100-summary retention limit. No secrets/dev artifacts are
included in the strict 17-file package.

## Remaining limitations and manual preflight

1. **High practical impact — actual volunteer layouts and media:** in each intended
   desktop Chrome environment, verify a populated signed-in Home and subscription
   feed, a watch video with captions, a playlist, live chat, a served ad and miniplayer.
   Try each toggle independently/together; restore and confirm the original nodes,
   playback, search and account actions still work. Do not require participants to
   reveal browsing history or notes. Unsupported layouts should stay visible.
2. **Medium — lifecycle on real hardware:** start a one-minute and untimed session;
   switch YouTube tabs/windows, minimize, sleep/wake for several minutes, quit/reopen
   Chrome, terminate the worker and reload the extension. Verify no unexplained gap
   is credited; recovery remains paused; breaks expire paused without duplicate prompts.
3. **Medium — assistive technology/physical Chrome UI:** pin/click the toolbar icon;
   repeat at 100%/200% zoom and with a screen reader. Tab/Shift-Tab through introduction,
   edit/cancel, checkpoint, break, reflection and deletion dialogs; test Escape and
   focus return. Confirm elapsed/countdown ticks stay quiet and phase changes are
   announced once. Test host/device theme combinations and unbroken 80-character text.
4. **Lower — density and compatibility:** optional settings, long plans, checkpoints
   and reflection still require vertical scrolling. Expanded docks occupy document
   flow and can scroll out of view; collapse/popup are available. Test Chrome 111–152,
   non-English navigation and YouTube experiments; no exhaustive support claim.

**Readiness:** suitable for personal testing and a narrowly scoped, supervised
YouTube usability pilot with these limits disclosed and the participant-environment
preflight completed. Not a broad-release or Chrome Web Store readiness claim.
No evidence here establishes improved well-being, reduced scrolling or user preference.
Next stage: complete the manual checks and collect voluntary feedback using the
existing pilot guide; no telemetry or invented findings.

## Try this reviewed build

`extension/dist/` and `extension/release/chrysalis-0.7.2-unpacked/` are loadable folders;
`extension/release/chrysalis-0.7.2.zip` contains only runtime assets/font licenses.
At `chrome://extensions`, enable Developer mode → Load unpacked → select the folder
containing `manifest.json`. Existing users should reload their existing installation,
then refresh YouTube. Use a disposable profile for review data. Earlier 0.7.1 packages
exclude these fixes. Final archive SHA-256:
`4422f9009431f764c2f68d3af6eeae5e96adb00b8a7fe5a910ea4cc7edcb832b`.
No publishing, deployment, Store submission or participant invitations were performed.
