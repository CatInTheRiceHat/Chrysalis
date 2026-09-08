# User experience contract — 0.7.0

## Surfaces and choices

- **Introduction:** a short, skippable explanation of desktop YouTube scope,
  optional planning/controls, local storage and in-page intention visibility.
  Get started and Skip both dismiss it without starting a session or hiding content.
- **Popup:** session first. Idle shows intention and an optional target; active,
  paused, checkpoint, break and finished states expose their working actions.
  Viewing preferences opens settings. Appearance/indicator controls are secondary.
- **Setup:** no target and no hidden recommendations by default. An explicitly
  saved default target fills future plans; each plan can override it. Editing
  preserves the original target. Custom intentions accept up to 80 characters.
- **Indicator:** intention, committed foreground YouTube time, optional target,
  phase, wall-clock break countdown, collapse/expand, pause/resume, checkpoint
  choices, voluntary breaks, early break ending, edit and finish. Edit opens a focused extension window using the same session UI.
  Finish ends accounting; it does not stop YouTube playback.
- **Settings:** real navigation to Viewing, Sessions, Checkpoints and Your data.
  Session preferences cover the default target, break length, indicator, initial
  collapse and theme. A checkpoint switch controls actual target transitions.
  Data controls show the real local summary count and provide confirmed deletion.

The existing butterfly PNG, bundled Montserrat/Abril fonts and warm neutral/plum
palette are reused. In-page text uses the system font to avoid exposing/loading
font resources on YouTube. No new dependencies or permissions.

## Placement and accessibility

The indicator and viewing-status disclosure reserve normal page flow. On watch
pages their dock is inside `#below`, beneath the player. On Home it occupies a full
row in the rich grid's content area, below the sticky filter row; it is not a
recommendation card. Other recognized browse/search roots use normal flow. Unknown
real YouTube app layouts without an anchor show no dock; the toolbar popup remains
available. These choices avoid a floating overlay on captions, search or navigation.

Both docks hide whenever the document enters fullscreen and return afterward.
They share one filtered placement observer; viewing-control support diagnostics
retain their separate observer. Each observer inspects a bounded batch and schedules
one refresh. Disposal/reinjection/page suspension release ownership, observers,
listeners and pending work. Collapse is local to the document, initially taken
from the saved preference; dismissal lasts until reload or indicator off/on.

Labels, native buttons/selects/details/dialog, visible focus styles and wrapping
support keyboard use and narrow/zoomed windows. Editing, cancellation, state actions
and dialogs restore focus to a useful visible control. The timer has no live
announcements. The indicator's phase announces only changed text. There are no
animations; reduced-motion preferences are respected.

## Privacy, messages and deletion

**The current intention is now intentionally visible in the YouTube page.** This
supersedes the earlier foundation's timing-only display decision, as requested for
this stage. A shadow root isolates styles, not secrets. Avoid private details in an
intention; turn the indicator off to remove its page UI. Collapsing is a visual
choice, not a privacy boundary. Completed history/reflections remain extension-only.

The content script receives current display data, session ID and revision. It may
send only constrained session actions, including validated additional/break
durations, or request a fixed extension surface. Native trusted clicks are required
by its UI;
synthetic page clicks are ignored. No webpage messaging bridge, external messaging,
arbitrary URL/window target or arbitrary plan/data mutation is accepted. Worker
sender checks, schema validation, request receipts and revision checks still apply.
Data deletion and plan editing remain in trusted extension pages.

`OPEN_PAGE` uses fixed local URLs with `chrome.windows.create` / `openOptionsPage`;
it does not require the `tabs` permission or raise the Chrome minimum for
`action.openPopup`. [Chrome windows API](https://developer.chrome.com/docs/extensions/reference/api/windows),
[Chrome action API](https://developer.chrome.com/docs/extensions/reference/api/action).

Schema **6** upgrades valid schemas 1–5 while preserving plans, recorded revisions,
break time, reflections and viewing choices. The new extension-pause default is
false. Unknown/corrupt records are preserved.
Clear history removes completed summaries and recent command receipts; it also
clears a finished current record, but keeps unfinished sessions and preferences.
Delete all clears plans/summaries/receipts, stops the session, restores default
preferences and shows the introduction. Open unsaved plan fields are cleared too.
The extension retains fresh defaults and non-personal monotonic revision/epoch
metadata so delayed old messages cannot recreate deleted records. Deletions are
serialized, confirmed only after persistence, and reject stale confirmation state.
No legacy app data, YouTube account data or YouTube history is touched.

## Validation and remaining checks

Commands and output directory are in [README](README.md). Unit tests cover schema
upgrades, real checkpoint semantics, deletion atomicity/failures/stale writes,
message boundaries and the earlier session/viewing behavior. The browser experience
suite uses a real unpacked extension with controlled YouTube-origin fixtures to
exercise introduction, preferences, long plans, indicator actions, trusted clicks,
editor focus, fullscreen, themes, 375px settings, actual Chrome tab zoom at 200%,
Escape/cancel/confirm deletion and first-use error recovery. Reports/screenshots:
ignored `test-results/experience-*.png` and `experience-report.json`.

A separate live test checks actual signed-out Home/watch placement, current intention,
foreground time, pause and collapse. The Home placement was corrected after visual
inspection found the first approach partly covered by YouTube's sticky filter row.
Live results are recorded separately in `experience-live-report.json`.

Native installed-Chrome toolbar popup interaction, physical screen readers, older
Chrome 111, signed-in accounts and all theater/miniplayer/experimental layouts
remain manual checks. Fullscreen and 200% zoom tests are actual browser behavior on
controlled pages, not claims of exhaustive YouTube-layout support. Reflection and
history browsing are implemented; see [the local history contract](HISTORY.md).

The checkpoint/break stage adds shared controls in `src/ui/choices.ts`. Dismissal
is persisted separately from target revision through the acknowledged-target state;
the exact behavior and allowed transitions are in [SESSION_MODEL](SESSION_MODEL.md).
The break deadline survives restart, while expiry leaves the session paused.
`npm run test:checkpoints` verifies these controls and lifecycle behavior on real
Chromium with controlled pages; it does not claim new live YouTube verification.

## Hardening additions

Popup/settings offer extension-wide pause with an explicit explanation that a
running break ends. Enable restores choices but requires a separate session Resume.
The control has the same labeled, keyboard-operable button and focus restoration as
other settings. Player-only `/embed` documents receive no dock. All settings section
fragments retain trusted-document permissions. See [HARDENING](HARDENING.md) for
actual browser evidence and the remaining native-toolbar/accessibility checks.
