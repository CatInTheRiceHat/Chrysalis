# Local history and reflection — 0.8.0

**0.9.2 update: untimed continuation is no longer an available action. Existing records containing null targets or untimed target revisions remain readable and retain their original meaning.**

**0.9.0 storage update:** current activity is browser-memory-only; optional completed history is password-encrypted, and unlocking never gates viewing. Browser restart/reload/update/disable clears temporary activity; earlier plaintext requires an explicit encrypt/delete choice. This supersedes older persistence/restart statements below. See [current privacy policy](PRIVACY.md) and `docs/encrypted-history-storage.md`.

## What is shown and stored

The popup offers an optional reflection after Finish: “Did this session match what
you wanted?” Yes, Partly and No are explicit choices, with a note up to 500
characters and a Save reflection button. Skip leaves `reflection: null` and
discards the draft note. It is never converted into No or included in a score.
Closing the popup without answering also leaves missing data. History offers an
explicit Add/Edit reflection action later. Cancel keeps an existing saved reflection;
Clear reflection explicitly removes its answer and note.

The worker atomically claims the automatic offer once for a finished session.
`reflectionPrompted` records a claimed automatic offer, not a response or a negative outcome.
Multiple popup windows, refresh and worker restarts cannot claim it twice. The
non-modal form does not interrupt YouTube or repeatedly request an answer. A failed
offer does not prevent finishing; manual reflection remains available in history.

Session history is in settings (`options.html#history`), reached from the popup's
Session history button. Every card comes from a real retained summary and shows:

- Local date/time derived from the recorded session start and device clock.
- Intention, original target (or No time target), and final target.
- Explicit target changes with their date, old/new target and chosen action.
- Measured foreground YouTube time and **separate wall-clock break time**.
- Optional reflection and note; missing answers say “Not answered.”

No length of session or target revision implies success/failure. Dismissals and
intention-only changes do not become target revisions. Added time, target edits and
untimed continuation do. New sessions retain the original target separately.

## Measurement, migration and retention

Schema **7** preserves valid schemas 1–6. Schema 6 gains the automatic-introduction preference; existing summaries and display choices are preserved. Schema 5 records retain all recorded
history and gain only the extension-pause default. Records from schemas 1–4 did not contain a full target
revision history or break time: migration marks their details incomplete and the UI
labels this absence. It does not infer revisions from original/final targets or
invent zero break time. Legacy reflection strings become note-only records with
`answer: null`; old records are not newly prompted. Unknown/corrupt data is left
untouched and reported as unavailable, rather than silently reset.

For new sessions, `history` contains `complete`, `targetRevisions`,
`omittedRevisions` and `breakMs`. Each revision stores `at`, `fromMs`, `toMs` and
`kind` (edit/extend/untimed). An open break also stores `breakStartedAt` alongside
its existing deadline. Ending/resuming/finishing a break adds the nonnegative
interval up to the earlier of that action or the break deadline. Expiry caps at the
deadline even when reconciled later. Browser-closed time within a voluntary break
is wall-clock break time, never foreground time. Device clock changes can affect
it; it is not proof of an activity away from YouTube. An already open break at
upgrade records only the interval from upgrade onward, labeled incomplete.

Retention is **the latest 100 completed sessions**, pruned atomically on Finish,
in completion order. Each keeps at most the latest **100 explicit target changes**;
an omitted-entry count makes truncation visible. Intentions remain capped at 80
characters and notes at 500. There is no age-based expiry. Current session data and
the bounded command receipt ledger follow the existing session contract.

## Privacy and deletion

All data stays in extension-local storage. History/reflection is restricted to
trusted extension pages. It is not sent to YouTube or included in content-script
display messages. The current intention still appears in the optional YouTube
indicator; turning that indicator off removes its page UI.

Chrysalis accesses YouTube **page structure** for viewing controls without storing
a video browsing history. This feature collects no video titles, URLs, searches,
transcripts or account identities, and adds no analytics, remote logging, accounts,
cloud sync, backend, permissions or export/upload mechanism. Notes and intentions
are rendered as text with `textContent`/form values, never inserted as HTML.

Delete session confirms and removes one retained record, including its reflection
and note. It also clears a matching finished current-session copy. Clear history
removes all summaries and a finished current record while keeping an unfinished
session and preferences. Delete all Chrysalis data additionally ends/clears the
current session and restores default preferences.

All operations share the worker's storage queue. A separate monotonic
`historyRevision` rejects stale reflection saves/deletion confirmations. Deletion
clears command receipts and advances session revision so old Finish retries cannot
recreate a record. Reset also advances settings/history revisions. Reflection only
updates a record that still exists; it never inserts one. Failed writes do not
claim success. Storage changes refresh every open extension surface and clear
draft note fields when their record disappears. Fresh defaults and non-personal
revision/epoch metadata remain after reset to reject delayed old operations.

## Verification

`npm run check` covers real record creation, separate break accounting, one-time
offers, missing reflections, deletion races, retention, old-schema preservation,
malformed data and message restrictions. `npm run test:history` loads the actual
unpacked extension in a disposable Chromium profile. It creates history through
real session actions and foreground observations on a YouTube-origin fixture,
compares displayed values with stored values, checks literal HTML-like text,
Skip/reopening, multiple surfaces, draft cleanup, delete-one/clear/reset and
light/dark narrow layouts. No sample summaries are seeded for that browser suite.
Reports/screenshots are ignored under `test-results/history-*` and
`test-results/reflection-popup.png`.

Native toolbar interaction, physical screen readers and older Chrome remain
manual checks. No new live YouTube layout-support claim is made by this stage.
