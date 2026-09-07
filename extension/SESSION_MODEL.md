# Session model and timing contract

Implemented in `src/session/model.ts`; persistence and serialization in
`src/shared/storage.ts`; Chrome event wiring in `src/background.ts`.

## User choices and states

Planning starts explicitly from the popup or settings page. Intentions include
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
| checkpoint | Continue viewing | active; same target will not prompt again |
| checkpoint | Pause | paused |
| paused | Resume | active; checkpoint immediately if a newly armed target is reached |
| active / paused / checkpoint | Take a break | break, user-chosen wall-clock deadline |
| break | End break / deadline reached | paused; never auto-resume |
| active / paused / checkpoint / break | Edit | same phase, except a changed target may clear/rearm checkpoint |
| active / paused / checkpoint / break | Finish | finished; save one summary before rendering it |
| finished | Done | idle; keep the summary |
| finished | Start another session | active, new ID and plan; keep previous summary |
| active / checkpoint | Unexplained observation gap | paused with recovery explanation; uncertain interval discarded |
| any unfinished state | New browser epoch | paused with restart explanation; no closed-browser time added |

All other transitions reject without partially applying the command. Checkpoint
is a decision state, **not a forced pause**: confirmed foreground time continues
while it is open. Breaks do not monitor what someone does away from YouTube.
This stage does not pause/resume the video player, close tabs, or enforce limits.

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
does not depend only on receiving `runtime.onStartup`. An unfinished session,
including a break/checkpoint, restores paused. The original/final plan, committed
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
- Schema 4 upgrades only this extension's valid schema-1/2/3 data at the existing
  `chrysalis.extension.v1` key, preserving display settings and any reserved records.
  Unfinished reserved records upgrade paused. Legacy website/Flutter data is untouched.
- The latest 100 completed summaries remain local; receipt metadata also contains
  recent plan choices. Reflection/history browsing is a later stage; confirmed deletion works in settings.
  Uninstall removes extension-local data. History/all-data deletion clears receipts and advances revisions to reject stale commands.

## Verification

`npm run check` covers domain/storage/protocol behavior and production output.
`npm run test:browser` loads the real extension into an isolated Chromium profile,
checks native Chrome tab/window signals and the popup flow against controlled
YouTube-origin pages, and restarts the browser. A near-target snapshot is seeded
only in that temporary test profile before real observations cross the target.
`LIVE_YOUTUBE=1 npm run test:browser` adds signed-out public YouTube checks.

See `../docs/extension-implementation-status.md` for results and unperformed checks.
