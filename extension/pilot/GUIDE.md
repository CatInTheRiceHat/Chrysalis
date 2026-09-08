# Chrysalis voluntary testing guide

**0.9.2 update: sessions require a chosen time target; type minutes directly or use a preset. At a checkpoint choose additional time, Finish, a break or dismissal that retains the target. Close/Escape remain available in the introduction; there is no explicit untimed start/continuation option.**

**0.9.0 storage update:** current activity is browser-memory-only; optional completed history is password-encrypted, and unlocking never gates viewing. Browser restart/reload/update/disable clears temporary activity; earlier plaintext requires an explicit encrypt/delete choice. This supersedes older persistence/restart statements below. See [current privacy policy](../PRIVACY.md) and `docs/encrypted-history-storage.md`.

This is an early desktop Chrome extension, independent of YouTube and Google.
Try it only if you want to. You can skip any task, choose entertainment, change your
mind, stop testing or remove the extension. Longer viewing is not a failed test.
Use ordinary, non-private wording for intentions. No viewing history, personal notes
or screenshots are required for feedback. The extension sends no telemetry.

Read [privacy](../PRIVACY.md) before installing and follow [installation steps](../INSTALL.md).
Keep this guide open separately. The complete exercise can take roughly 10–15 minutes;
that is a suggested allowance, not a requirement or an observed completion statistic.

1. **Start a session.** Open Chrysalis from Chrome's Extensions menu. Skip/read the
   introduction. Choose an intention and start with **No time target**. Browse
   YouTube normally; foreground time should advance only when its tab/window is active.
2. **Try one viewing control.** Open Viewing preferences. Choose one relevant control
   (Home recommendations, watch-page related videos, or Shorts entry points). Look
   at its effect, then turn it off to restore the surface. If the layout is
   unfamiliar, leave it usable and note only the page type. Direct Shorts URLs work.
3. **Revise a target.** Open Edit intention / target. Choose a custom total target
   one or two minutes above the elapsed foreground time (whole minutes, 1–1440),
   then save. You can also change intention. The original plan stays recorded.
4. **Respond to a checkpoint.** Keep a YouTube tab active until the target is reached.
   Choose what you prefer: additional time, no target, Finish or a break. You may
   dismiss it; time keeps counting and dismissal does not add a new target. If you
   finish here, start another session only if you want to try the next task.
5. **Try a voluntary break.** Choose a suggested duration or Custom → 1 minute,
   then Take a break. Foreground time stops; the break countdown uses wall-clock
   time. YouTube remains available. End break early or let it expire: the session
   stays paused until you choose Resume. You may finish instead.
6. **Finish and optionally reflect.** Choose Finish session. Answer Yes, Partly or
   No, optionally add a short note, or choose Skip. Open Session history to review
   the actual plan, revisions, foreground duration and separate break duration.
   You do not need to show this history or your answer/note to anyone.
7. **Turn Chrysalis off and delete data.** Pause Chrysalis restores the layout and
   stops timing; it ends any running break. Enable restores saved controls, then
   Resume separately if wanted. In settings, try Delete session, Clear session
   history, or Delete all Chrysalis data—read the confirmation first. Reset all
   also clears preferences/current session. None changes your YouTube history.
   Chrome's `chrome://extensions` card can disable or Remove Chrysalis completely.

Feedback is optional: use [these short questions](FEEDBACK.md) through the channel
you and the organizer agree on. Report a confusing control or bug without sharing
what you watched. Stop and restore the layout if a player or navigation area becomes
unusable; the popup remains the fallback for an unsupported indicator layout.

## Organizer preflight — proposed procedure, not completed participant research

This package is verified for personal testing. Do these checks before inviting a
small pilot; this document does not assert they have already happened:

- Try the actual native Chrome toolbar popup and the steps above on the intended
  participants' Chrome/OS setup. Check physical sleep recovery, the intended
  signed-in/populated layouts, captions/fullscreen, keyboard and relevant assistive
  technology. Record failures and limit the pilot to supported setups.
- Offer the ZIP together with this guide, privacy explanation and limitations, not
  an unlabeled archive. Confirm volunteers can decline or stop without penalty.
  Do not ask for passwords, history exports, storage dumps or personal reflections.
- Choose and communicate a contact/feedback channel before inviting volunteers.
  Proposed retention: keep only voluntarily supplied usability feedback for up to
  30 days after the pilot ends; delete identifiable raw feedback afterward. Explain
  how a volunteer can request deletion. Do not promise anonymity if the channel
  exposes their name/email. These are organizer actions, not implemented software.
- Take notes only with permission. Sharing a screen or quote needs separate,
  specific permission; do not assume installation authorizes either. Avoid screen
  recording by default. If formal research is intended, determine any applicable
  institutional requirements before recruitment rather than claiming approval.
- Summarize concerns and uncertainty, not scores about participants' behavior.
  Treat unanswered/declined items as missing data. Do not present this small,
  self-selected usability exercise as evidence of mental-health or causal benefits.

No recruitment, contact messages, account setup or external data collection has
been performed as part of preparing these files.
