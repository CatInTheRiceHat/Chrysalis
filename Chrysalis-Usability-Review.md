# Chrysalis usability review

Reviewed September 8, 2026 · Extension 0.4.0 · `main` at `2e066210fc933d5b20c573cb50d0ceb542854a8d`

## Verdict

**The current build is a YouTube-only preview. It is not yet verified for general user rollout, and it does not implement Instagram support.** The session foundation passes its existing automated checks, but several source-level usability issues need attention and the requested live visual review remains incomplete.

This review inspected the current repository, extension manifest, popup/settings markup and styles, session interface, injected indicator, placement logic, viewing controls, documentation and existing test coverage. `npm run check` passed: 40 unit tests, TypeScript checking, production build and generated asset/manifest checks. No tracked application files were changed.

The review browser blocked Chrome's extension-management page. Local static preview navigation was also unavailable. Consequently, **no live extension interaction, rendered screenshot comparison, native toolbar popup measurement, or Instagram interface inspection was completed in this review**. The findings below distinguish source-confirmed behavior, usability judgments and unverified scenarios. Previously recorded browser-test results are repository claims, not tests rerun here.

## Priority findings

Priority meanings: P1 = resolve before claiming the intended experience works; P2 = fix or explicitly account for before a wider pilot; P3 = polish after core behavior is verified.

### 1. Instagram support is absent — P1 if both platforms are promised

**Source-confirmed.** `extension/static/manifest.json:31` matches only `https://www.youtube.com/*`. The content implementation and placement adapter are YouTube-specific. The implementation-status document explicitly limits this release to desktop YouTube.

Users visiting Instagram will not receive Chrysalis's injected session controls or feed changes from this build. A popup that can open there is not evidence of integration.

**Next step:** present this release as YouTube-only, or implement and separately test Instagram integration. Adding a manifest match alone is insufficient: Instagram needs its own page recognition, placement, navigation handling and behavior tests. Native mobile apps are outside this Chrome-extension review.

### 2. Collapsing hides the checkpoint and session phase — P1

**Source-confirmed; user impact inferred.** In `src/content/indicator.ts:23–26`, compact mode shows elapsed foreground time but hides `#details`, which contains both the phase message and action buttons. The compact text does not distinguish active, paused, checkpoint or break states. A time target reached while collapsed therefore has no visible checkpoint-specific cue in the indicator.

This undermines the central opportunity to notice time and make a choice. A frozen compact timer during a pause or break can also look like a malfunction.

**Fix:** retain a short phase label in compact mode, such as “Target reached,” “Paused” or “On a break.” Provide a clear way to reveal the checkpoint choices. Preserve the user's collapsed preference; do not require a forced expansion or sound.

**Acceptance:** start with a short target, collapse, reach the target and verify a visible, keyboard-accessible cue. Check paused and break states too. Screen-reader testing should confirm a single useful phase announcement, without continuous timer announcements.

### 3. The in-page checkpoint lacks a break choice — P2

**Source-confirmed.** `src/content/indicator.ts` offers Continue viewing, Pause, Edit plan and Finish at a checkpoint. Its action set contains no break action. The full session interface in `src/ui/session.ts` does offer Take a break.

A person at the YouTube checkpoint must find the toolbar popup or enter the editor to access that choice. The interface does not make that route clear.

**Fix:** offer “Take a break” in the indicator, either using the saved break length or opening the full session controls at that section. Preserve the existing trusted-click and message-validation boundaries.

**Acceptance:** from a checkpoint on YouTube, a user can start a break without searching through unrelated settings. Break expiry leaves the session paused, as designed.

### 4. Pause, Finish and Break can be confused with video controls — P2

**Source-confirmed labels; comprehension risk needs user testing.** The injected buttons say “Pause” and “Finish.” These affect session accounting, not YouTube playback. The popup's timer explanation describes accounting, but the in-page controls do not explain this distinction next to the action.

**Fix:** use explicit labels such as “Pause session” and “Finish session,” with a short explanation that the video continues. Explain the effect of a break when it starts. Automatic video pausing would be a separate product decision, not an incidental usability fix.

**Acceptance:** ask a first-time user what will happen before they click Pause or Take a break, then compare their expectation with actual behavior.

### 5. Successful refresh can leave a stale error visible — P2

**Source-confirmed logic issue; not browser-reproduced here.** `src/ui/session.ts:111–116` renders successful refresh results but does not clear `#session-error` or `#session-retry`. The Refresh session handler calls this same function. Those elements are cleared on a successful session command at line 129 instead.

After a temporary read failure, the session can recover while the old failure message and retry button remain. That makes a working session look unreliable.

**Fix:** distinguish read/recovery errors from plan-validation or command errors. Clear a resolved read error after a successful refresh; do not silently discard an unrelated invalid-plan warning.

**Acceptance:** fail one snapshot request, allow the next to succeed, and verify the recovered session no longer displays the obsolete read failure. Also verify an invalid custom duration keeps useful feedback until corrected.

### 6. The restore-layout instruction omits a navigation step — P2

**Source-confirmed.** `src/content/viewing-controls.ts:57` tells users to open Chrysalis and choose Restore ordinary layout. That button is in settings, not the initial popup. The popup has both Viewing preferences and Open settings; `src/ui/page.ts:97` sends both to the same settings page.

**Fix:** say “Open Chrysalis → Viewing preferences → Restore ordinary layout,” or provide a clear link to the appropriate settings section. Make Viewing preferences navigate directly to Viewing so it has a distinct purpose.

**Acceptance:** after hiding recommendations, a new user restores the ordinary layout without coaching. Confirm all open supported tabs restore and the current session remains intact.

### 7. Break status is less informative on YouTube — P2

**Source-confirmed.** The full session interface displays break time remaining. The injected indicator displays only “On a break,” plus elapsed foreground time and End break. Compact mode hides even the break label.

**Fix:** at minimum retain break status in compact mode. Consider showing time remaining in the expanded indicator if the existing safe display protocol can support it. Explain that expiry leaves the session paused.

**Acceptance:** a user can identify that a break is active, understand how it ends and resume deliberately without needing to interpret a frozen timer.

### 8. The visual hierarchy needs real rendered inspection — P2 verification gap

**Source-confirmed design inputs; layout quality unverified.** The popup is 390 CSS pixels wide. Active/checkpoint views include an intention, large timer, current/original targets, several actions, break controls, explanatory copy, preferences and footer. The indicator is expanded by default and renders even while idle. Viewing controls add a second in-page disclosure. These are reasons to inspect density, scrolling and intrusion; they are not evidence of actual clipping.

**Inspect:** whether Start session and checkpoint choices are easy to find in the native popover; whether custom intentions, editing and summary states require excessive scrolling; whether the two page disclosures push useful content too far down; whether a compact idle presence is sufficient.

**Acceptance:** record the installed native popup at the user's normal display scale and at 200% browser zoom where applicable. Check a long intention, a narrow window, expanded preferences and error states. Verify no unreachable action or horizontal clipping. Measure actual behavior before redesigning.

### 9. Theme and copy polish — P3

**Source-confirmed, with subjective impact.** The indicator's system theme follows `prefers-color-scheme`, not an explicit YouTube appearance setting. If those choices differ, its panel can contrast sharply with the surrounding page. This needs visual inspection, not an automatic assumption that the design is wrong.

The popup also repeats unchanged target values (“15 minutes · Originally: 15 minutes”), and several user-facing descriptions emphasize “recognized,” “supported” and “foreground.” These terms explain real boundaries but increase reading effort.

**Polish:** show the original target only when it differs; test plainer explanations such as “Time spent with YouTube in the active tab”; keep accurate support details available under an explanation. Check light/dark combinations before choosing whether to follow YouTube or the device theme.

## Existing strengths to preserve

- Targets and recommendation hiding are optional; entertainment is a valid intention.
- Settings and session data are local; the source and manifest show a narrow capability scope.
- Hide/restore is designed to preserve page nodes and protected player, ad and playlist content.
- Session logic accounts for focused tabs, interruptions, restarts and concurrent commands; the existing relevant unit tests pass.
- Markup includes labels, focus styles, native controls, confirmation dialogs and reduced-motion handling. Actual assistive-technology usability remains unverified here.
- Intention visibility is disclosed. Collapsing the indicator must not be presented as a privacy boundary.

## Live review checklist still required

Mark each scenario Pass, Fail, Blocked or Not tested. Record the extension revision, Chrome version, account state, viewport/display scale, steps, expected result, actual result and a screenshot or short recording for each failure. Keep populated live-page results separate from fixture results.

| Area | Scenarios | What must hold |
|---|---|---|
| First use | Install, open native popup, Get started, Skip | Scope understood; no accidental session or hidden feed; next action obvious |
| Session setup | Preset/custom intention, no target, short target, invalid duration, edit/cancel | Clear feedback; fields retained appropriately; original target preserved |
| YouTube Home | Populated signed-in feed; empty/signed-out state; each hide toggle alone and together | Intended items hide; unfamiliar content stays usable; restoration works |
| Watch page | Standard/theater/fullscreen/miniplayer; captions; playlist; live chat; ads | Indicator avoids essential controls; playback and navigation continue correctly |
| Navigation | Home → watch → search → subscriptions → Shorts → back/forward; refresh | No duplicate or stale UI; rules apply only where intended |
| Checkpoint | Expanded, collapsed, dismissed, indicator off, fullscreen | Available reminder behavior is understandable; choices work where exposed |
| Timing | Pause/resume, break/expiry, tab switch, multiple YouTube tabs, unfocused Chrome, restart | No double counting; exclusions and restored pause behavior understandable |
| Recovery | Brief read/save failure; refresh/retry; extension reload/disable | No false success, stale failure state or confusing abandoned UI |
| Appearance | Light/dark combinations; narrow window; long intention; zoom | Readable text; visible focus; no clipped or unreachable controls |
| Accessibility | Keyboard-only session and settings; screen-reader phase/dialog checks | Logical focus; useful names; no timer announcement spam or focus loss |
| Data | Disposable test profile: finish, clear history, delete all, cancel deletion | Effects match explanations; cancellation is safe; local state stays consistent |
| Instagram | Feed, Reels, Explore, profiles, Stories, overlays and navigation | Currently blocked by absent implementation; define intended scope before testing |

The repository itself records prior signed-out YouTube checks, but populated Home hiding, authenticated layouts, native toolbar behavior and several player layouts still need live coverage. This review does not upgrade those claims to verified.

## Small first-user usability pass

After addressing the high-priority findings, ask a few first-time users to complete the following without instruction about where to click:

1. Start a session for watching one video with a short time target.
2. Hide related recommendations and then restore them.
3. Collapse Chrysalis and notice what happens at the target.
4. Take a break and return to the session.
5. Change the intention or target and finish.

Record task completion, misclicks, requests for help and what users expected each control to do. This checks comprehension and usability; it does not establish reduced scrolling or improved well-being.

## Next evidence needed

A screen recording of the installed extension would allow an actual visual review: show first use, a populated YouTube Home page, a watch page, the toolbar popup, a collapsed checkpoint, settings, hide/restore and a narrow window. Use a short test intention with no private details. If another branch or local build implements Instagram, provide that exact revision or extension source as well; the reviewed `main` does not include it.

Do not describe this review as a completed two-platform visual sign-off. It is a completed source-based review and passing non-browser validation, with live visual and usability verification outstanding.
