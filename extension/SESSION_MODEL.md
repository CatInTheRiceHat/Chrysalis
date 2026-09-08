# Session model and timing contract

**0.9.2 update: new starts/edits require a non-null time target. The continue-untimed command is removed; checkpoint dismissal retains its original target and measured overtime. Read validation still accepts earlier null targets/history. Tab activation sends a trusted worker hint, and pending observations retain the latest visibility signal for immediate follow-up.**

**0.9.0 storage update:** current activity is browser-memory-only; optional completed history is password-encrypted, and unlocking never gates viewing. Browser restart/reload/update/disable clears temporary activity; earlier plaintext requires an explicit encrypt/delete choice. This supersedes older persistence/restart statements below. See [current privacy policy](PRIVACY.md) and `docs/encrypted-history-storage.md`.

Implemented in `src/session/model.ts`; persistence and serialization in
`src/shared/storage.ts`; Chrome event wiring in `src/background.ts`.

## User choices and states

Planning can start from the automatic centered YouTube introduction, popup or settings page.
See [Integrated YouTube sessions](YOUTUBE_SESSION.md) for introduction suppression,
floating timer behavior and verification. The introduction accepts an optional
intention and uses “Your session” when it is empty. Intentions include
Studying, Watching a specific video, Entertainment, Exploring, and a custom single
line of 1–80 characters. No video URL is collected. Targets offer 5/15/30/60-minute
presets, custom whole minutes from 1 to 1440, or **No time target** (the default).
The same validation runs in the UI, protocol and domain model.

`originalTargetMs` is assigned once at Start. `targetMs` holds the current plan;
editing never replaces the original. Checkpoints can be disabled in settings; this suppresses target transitions and
closes an open checkpoint without stopping time. Turning them back on can show an
unacknowledged target already reached. An intention-only edit does not rearm a
previously acknowledged target. A changed target does; choosing no target clears
it. Setting a target already reached shows a checkpoint while active, or on
Resume if paused. Editing a target means a new **total** session target.

| From | Action/event | To / result |
| --- | --- | --- |
| idle | Start | active, new local session ID and original plan |
| active | Pause | paused, settle short foreground tail |
| active | Target reached | checkpoint, acknowledge this target once |
| checkpoint | Dismiss checkpoint / collapse or close its in-page prompt | active; target unchanged, quiet indicator; same target will not prompt again |
| checkpoint / active with a reached target | Continue with additional duration | active; target becomes settled foreground time plus chosen duration; explicitly rearm |
| checkpoint / active with a reached target | Continue without a time target | active; current target cleared, original target retained |
| checkpoint | Pause | paused |
| paused | Resume | active; checkpoint immediately if a newly armed target is reached |
| active / paused / checkpoint | Take a break | break, user-chosen wall-clock deadline |
| break | End break / deadline reached | paused; never auto-resume |
| break | Resume session now | active; clear the deadline; explicit user action |
| active / paused / checkpoint / break | Edit | same phase, except a changed target may clear/rearm checkpoint |
| active / paused / checkpoint / break | Finish | finished; save one summary before rendering it |
| finished | Done | idle; keep the summary |
| finished | Start another session | active, new ID and plan; keep previous summary |
| active / checkpoint | Unexplained observation gap | paused with recovery explanation; uncertain interval discarded |
| unfinished, except break | New browser epoch | paused with restart explanation; no closed-browser time added |
| break | New browser epoch | preserve unexpired deadline; expired break becomes paused; reject stale pre-restart commands |

All other transitions reject without partially applying the command. Checkpoint
is a decision state, **not a forced pause**: confirmed foreground time continues
while it is open. Breaks do not monitor what someone does away from YouTube.
This stage does not pause/resume the video player, close tabs, or enforce limits.

## Checkpoint and break choices

The in-page indicator and popup offer “You planned [duration]. What would you like
to do next?” with additional-time presets/custom minutes, untimed continuation,
Finish, and suggested/custom breaks. Dismissal is a separate operation: it does
not extend or remove the target and is not recorded as an extension in summaries.
The old `continue` command remains a compatibility alias for dismissal; no UI
labels it as a chosen extension. There is no escalating prompt, sound, tab closure,
playback interruption, modal overlay, automatic scrolling or focus grab.

`goalAcknowledged` is persisted when the one global target crossing occurs. The
checkpoint phase is one pending decision mirrored by open surfaces, not independent
per-tab timers or queued notifications. Repeated observations/read/reinjection do
not create another transition. Dismissal persists active/acknowledged atomically,
so other tabs, refresh and worker/browser recovery cannot reopen that target.
Intention-only edits do not rearm; a different total target or an explicit added
duration does. Checkpoints disabled in settings leave accounting enabled. Turning
them back on can offer a reached target only if it was never acknowledged.

Additional time starts at the measured foreground total **when the choice commits**,
including a valid short observation tail, rather than at the old target. The new
target can therefore include seconds/milliseconds; intention edits can retain it
exactly. Custom durations are whole minutes from 1–1440; the revised total target
also has the existing 1440-minute maximum. Validation failures leave the plan
unchanged and offer less additional time or untimed continuation. Original target
and final target remain separate; target labels round subsecond precision upward.

Fullscreen reduces the floating timer to an accessible restore tab. A reached
target offers one centered check-in in the foreground document, including fullscreen.
Collapsing or hiding the timer does not change the session. Explicitly dismissing
the check-in keeps counting without another automatic interruption for that target
revision. See [YouTube sessions](YOUTUBE_SESSION.md) for prompt ownership rules.

Break suggestions are 2/5/10/15 minutes, plus custom 1–1440 minutes. The saved break
preference fills the choice. There is no “optimal” duration or session-matching
claim. The wall-clock countdown does not announce each tick. End break leaves the
session paused; Resume session now is an explicit resume; Finish saves the measured
session. None block YouTube. In-page visible-break reads update/reconcile once per
second; these are display wakeups, not elapsed-time credits or a worker keepalive.

## One authoritative timeline

The worker is the sole writer. Settings, user commands, observations, lifecycle
boundaries, reads that reconcile recovery, and schema upgrades share a serialized
queue. Every operation reads persisted state within that queue; in-memory values
are coordination only. A complete snapshot is written together, including the
summary and command receipt on Finish.

Commands carry a random request ID, expected session ID and expected session
revision. The last 64 receipts retain the full command signature. An exact retry
returns current state without reapplying it; reuse with different contents rejects.
Other stale/repeated clicks reject on revision/ID mismatch. Older retries beyond
the receipt window still cannot apply against a newer revision. Session revisions
change on choices and automatic state transitions, not on each elapsed update.
Settings retain their own revision. A monotonically increasing snapshot sequence
orders UI updates; an open editor retains the revision at which its draft began.

Writes are awaited before success. Failure leaves the persisted snapshot/receipt
unchanged, and the queue remains usable. The popup reports errors; a failed
observation reports a timing-save problem on the indicator. No startup/reset path
silently replaces unknown or corrupt saved data.

## Foreground YouTube time

Time counts only in active/checkpoint state when:

- the sender is this extension's top-frame document on `https://www.youtube.com`;
- the document reports visible;
- Chrome confirms its tab is active, not discarded/loading, and belongs to the
  **last-focused window, which must still be focused and not minimized**.

This includes browsing, reading and paused video. Background playback and
picture-in-picture outside that foreground tab are excluded. A toolbar popup
may leave YouTube as the active tab; opening settings as another tab does not.
This measurement is not exact video watch time, attention or productivity.

Visible content scripts request observations roughly every **2 seconds** while
active/checkpoint, and on visibility/pageshow boundaries. These foreground
timeouts are signals, not a timer counter. There is no background `setInterval`,
keepalive, or assumption that ticks arrive on schedule. Popup polling only reads
the state and reconciles recovery/break expiry; it never credits time.

An anchor stores one tab/window/document owner, worker-received wall timestamp
and document monotonic timestamp. A second eligible observation from that owner
credits the smaller measured delta. Document changes start a new interval,
without bridging the gap. Per-document sequences reject duplicate/out-of-order
signals; a bounded 32-document ledger prevents stale visibility messages from
recreating ownership. Even competing eligible tabs can only replace one anchor.

Tab activation, focus loss, tab removal/detachment/loading, and document hiding
end the matching interval. Events unrelated to the owner do not end it. A known
boundary may credit a short wall-clock tail, then clears the anchor. Timestamps
are captured at receipt, not after queued work finishes. An API/queue delay over
1 second discards that observation's interval rather than backfilling it.

## Gaps, suspension and restart

An interval is rejected if it exceeds **5 seconds**, goes backwards, or its
document/wall deltas disagree by more than **1 second**. A previously counting
session becomes paused with “Timing signals were interrupted”; the whole uncertain
interval is excluded. A resumed session starts a fresh anchor. If there was no
foreground owner (for example while away from YouTube), there is no gap to credit
or pause for; the next eligible tab starts a new interval.

The browser epoch is a random value in `chrome.storage.session`. Chrome preserves
it across worker suspension but clears it on browser restart/extension reload.
Every serialized read reconciles this epoch with the local snapshot, so recovery
does not depend only on receiving `runtime.onStartup`. An unfinished viewing session,
including a checkpoint, restores paused. An unexpired voluntary break retains its
deadline and never resumes viewing; an expired break restores paused. Its revision
advances so an old queued Resume cannot restart viewing. The original/final plan, committed
elapsed time and summaries survive. Document ownership is reset.

Within the same epoch, a restarted worker may reconcile a short valid observation
against the persisted anchor. A longer missing interval is excluded and pauses.
If a snapshot write was interrupted, committed data remains the recovery baseline;
the extension never estimates hours since `startedAt`.

Break deadlines use wall time and are checked on the next message/read/lifecycle
event. No alarm or notification permission is needed: no action must run exactly
at break expiry, and expiry only leaves the session paused. Device clock changes
can shorten/lengthen a break. Recorded start/finish dates also depend on that clock;
finish dates are clamped to start dates if the clock was moved backwards so the
user can still finish. Elapsed duration remains separately measured.

## Accuracy and data limits

- This is deliberately conservative sampling. Normal progress is saved about
  every 2 seconds and at state/boundary changes. Start/resume/handoff delays and
  discarded intervals can undercount. The UI shows committed time in steps.
- Abrupt termination can lose the last unsaved observation (normally around
  2 seconds; longer with storage delay/failure). There is no total-session error
  guarantee. Lifecycle delivery latency can affect a short boundary tail, and
  interruptions shorter than the 5-second threshold may not be distinguishable.
- Long sleep/freeze/missing-signal intervals are not silently added. Unit tests
  inject these gaps; physical OS sleep has not been exhaustively verified.
- The single local snapshot includes internal tab/window/document IDs and a
  recent sequence ledger for atomic accounting. They are not video/account IDs,
  contain no URL/title/search, are absent from summaries, and clear on restart or
  finish. No document ledger is retained while idle or newly observed while paused.
- Schema 7 upgrades only this extension's valid schema-1/2/3/4/5/6 data at the existing
  `chrysalis.extension.v1` key, preserving display settings and any reserved records.
  Unfinished reserved records upgrade paused. Legacy website/Flutter data is untouched.
- The latest 100 completed summaries remain local; receipt metadata also contains
  recent plan choices. Optional reflection, local history and confirmed deletion work
  in extension pages; [HISTORY.md](HISTORY.md) documents recorded revisions, separate
  break totals, missing old data and retention.
  Uninstall removes extension-local data. History/all-data deletion clears receipts and advances revisions to reject stale commands.

## Verification

`npm run check` covers domain/storage/protocol behavior and production output.
`npm run test:browser` loads the real extension into an isolated Chromium profile,
checks native Chrome tab/window signals and the popup flow against controlled
YouTube-origin pages, and restarts the browser. A near-target snapshot is seeded
only in that temporary test profile before real observations cross the target.
`LIVE_YOUTUBE=1 npm run test:browser` adds signed-out public YouTube checks.
`npm run test:checkpoints` separately covers fullscreen target crossing while real
fixture media plays, worker stop, dismissal across tabs/refresh, added/untimed
choices, break countdown, early end/resume, actual browser restart and expiry.
Proximity to a target/deadline is seeded only in the disposable test profile.

See `../docs/extension-implementation-status.md` for results and unperformed checks.

## Extension-wide pause (0.7.0)

`settings.extensionPaused` defaults to false; schema 5 upgrades preserve every
existing field and add only this default. Pausing and settings changes share the
same authoritative mutation queue and timestamp boundaries as session commands.
Pause settles a short observed foreground tail, ends a running break with its
elapsed wall-clock total, moves any unfinished session to `paused`, and clears
foreground ownership/signals. Idle and finished states retain their phase.

Enabling restores saved viewing controls but leaves a session paused. Start,
Resume, new breaks and target continuation require enabling first; Edit and Finish
remain available. Both pause and enable advance the session revision so old actions
cannot resume or change the session after a newer choice. Duplicate settings
messages conflict rather than applying twice. Reset-all clears the pause preference.

Content pauses remove all owned UI/styles/observers and cancel timing/deadline
polling. A local visible-document check every five seconds detects extension-context
invalidation without worker messages or storage writes. Native visibility changes
are used for sampling; synthetic webpage visibility events are ignored. Timing
persistence is bounded by the two-second observation cadence per visible document
plus actual lifecycle/action boundaries, not rendering. Other visible windows can
produce anti-replay signal writes but never add a second foreground timeline.
