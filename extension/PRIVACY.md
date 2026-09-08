# Chrysalis privacy explanation

Applies to local preview 0.9.1. Updated 2026-09-08.
Chrysalis is independent and is not affiliated with or endorsed by YouTube or Google.
Supports desktop Chrome 114+ on www.youtube.com only.

## Activity stays in browser memory by default

The timer, optional introduction and viewing controls work without a password.
Chrome's extension session storage holds your current plan, intention (up to 80
characters), original/current target and changes, session dates, foreground YouTube
time, break deadline and measured break time. It also holds up to 100 completed
session summaries and optional Yes/Partly/No reflections and notes (up to 500
characters). Skip leaves no answer. Each record keeps at most 100 target changes,
an omitted-change count and its measured break duration.

This memory also holds session IDs, revision counters, up to 64 recent command
receipts (which can contain a plan), up to 32 document sequence markers, timing
anchors with tab/window/document IDs and timestamps, a browser-epoch ID, and visit
metadata that prevents repeated introductions and checkpoints. A visit renews during
foreground YouTube use; a new one begins after 30 minutes away. These are technical
identifiers, not advertising IDs.

Session memory survives service-worker suspension/restart but is cleared by Chrome
when the browser restarts or the extension is updated, reloaded, disabled or removed.
Current sessions and breaks are not recovered after those events. Temporary history
and unsaved changes are lost. Page refreshes and normal tab navigation do not erase
this memory. It is not a cloud backup or a measure of attention.

## Preferences on this device

Chrome's local extension storage keeps appearance, viewing toggles, indicator
visibility/collapse, introduction preferences, default durations, checkpoint choices
and the global pause preference. These preferences contain no free text or activity
records and are not encrypted by Chrysalis. They remain until changed, reset or the
extension is removed. A non-personal deletion marker prevents interrupted cleanup
from reviving deleted data.

## Optional encrypted history

In Session history, you can enable saving between browser restarts with a password
of 12–128 characters. Completed summaries and reflection edits then save automatically
while history is unlocked, keeping the latest 100 records. There is no age-based expiry.
Saved records are encrypted on this device using AES-256-GCM, a fresh random nonce
for each write, and a PBKDF2-SHA-256 password-derived key with a random salt and
600,000 iterations. Format information, salt, nonce and authentication tag accompany
the ciphertext; they contain no session text or activity dates.

The password is never stored. The unlocked decryption key and decrypted records live
only in trusted extension session memory, not in persistent local storage. The
service worker imports a non-extractable Web Crypto key for encryption operations.
Worker suspension retains the session-memory key; browser restart, extension reload,
update or disable clears it and locks history. Lock saved history removes the key and
saved records from session memory. An active plan remains available to the timer.
Someone controlling an unlocked device/browser may access its memory; encryption
does not protect against that access. Device/OS backups, swap or crash dumps are
outside Chrysalis's control. No forensic erasure or guaranteed Store approval is claimed.

Locked history never blocks the timer or viewing controls. New completed sessions
stay temporary while locked and merge into saved history when you unlock. Only the
latest 100 combined records are kept. If saving fails, Chrysalis reports unsaved
changes; keep Chrome open and retry. Locking is refused until you save or explicitly
delete those changes. Closing Chrome can still lose unsaved changes. There is no
password recovery, export/import or cloud sync.

## Earlier versions and your migration choice

Version 0.8.0 and earlier used unencrypted local activity storage. On upgrade, that
record is preserved until you explicitly choose to encrypt it or confirm deletion.
A notice in the popup and history settings remains while the choice is pending;
new activity already uses session memory and does not extend the old plaintext record.

Encrypt earlier data keeps the latest 100 combined completed records and an encrypted
archive of an unfinished plan. It does not restart that plan. Old command receipts and
timing identifiers are discarded. Encryption is checked before a single durable write
replaces the sole old plaintext record; no migration backup copy is created. A failed
or unreadable migration does not silently reset the earlier record. If a write's
acknowledgment is interrupted, reopen history: a successful encrypted replacement can
be unlocked, while an unchanged earlier record still offers the migration choice.

Delete earlier data requires a separate confirmation and removes the old history,
notes, unfinished plan and technical records, keeping current preferences and new
browser-session activity. Until a choice succeeds, the old plaintext remains on disk.
Chrysalis cannot erase copies previously made by device backups or recover forgotten
passwords. Moving from an unpacked extension to a future Store installation does not
automatically transfer local settings or history between extension identities.

## What the extension reads and exposes

On https://www.youtube.com, Chrysalis reads the page address, relevant link paths and
page structure to recognize supported Home, related-video and Shorts entry points.
It reads tab visibility and browser focus for foreground timing. Browsing and playback
both count; this is not exact watch time. It does not save video titles, video URLs,
search queries, transcripts, account identities or a video browsing history. It uses
no Google OAuth or YouTube Data API.

Your intention is visible to YouTube when entered or displayed in the in-page session
form or expanded timer. That page can read it. Avoid private details; hiding the
indicator does not hide text typed into the introduction. Reflections, notes, saved
history and history passwords are shown only in trusted extension pages. Both Chrome
storage areas are restricted to trusted extension contexts; content scripts cannot
read full snapshots, saved history or decryption keys.

## Sharing and limited use

No session data, preferences, reflections, passwords or keys are uploaded by Chrysalis.
There are no analytics services, remote logging, advertising, accounts, cloud sync
or AI processing. Executable code, fonts and artwork are bundled. Developers cannot
remotely read extension storage. YouTube and Chrome continue under their own policies.
The in-page intention exposure described above remains relevant despite no uploader.

Chrysalis uses locally handled information only for its disclosed session and
viewing-control purpose. It does not sell it, transfer it for advertising, use it for
credit decisions or provide remote human access to it. This is its Limited Use
commitment, not a claim of Chrome Web Store approval.

## Deletion and controls

Delete session removes a visible summary and recent command receipts. If history is
unlocked, that deletion is saved into encrypted history; watch for save errors.
Clear session history deletes both encrypted and temporary history, any earlier-plan
archive and command receipts, and disables persistent history. It works without the
history password, after confirmation, while keeping an unfinished current session and
preferences. Delete all Chrysalis data also ends the current session, clears temporary
visit/key state and restores defaults. Pending earlier-version data requires its
separate migration choice first. Deletion markers prevent stale memory from reviving
records if cleanup is interrupted. These controls do not delete YouTube history.

You can edit your plan, pause the extension, hide the indicator, skip/edit/delete a
reflection and disable/remove Chrysalis using Chrome's Extensions page. Uninstalling
clears its local storage. Clearing ordinary browser history does not clear extension
storage. No server account or remote data-deletion service exists for the extension.

## Website and voluntary feedback

The public website has a separate theme preference and uses Vercel hosting, which
receives ordinary HTTPS request information such as IP address, user-agent, path and
time. No extension records are sent to the website. Hosting log retention is separate
and was not verified. The site includes no analytics scripts or feedback uploader.

Public bug reports are available at https://github.com/CatInTheRiceHat/Chrysalis/issues;
posting is voluntary and uses GitHub's account and privacy policies. Issues expose
your GitHub identity and submitted text publicly. Never post private notes, storage
dumps, participant credentials or password-reset links. Email contact is
elaineyouyuanche@gmail.com; delivery was not independently tested. Share only what
you choose. Neither channel automatically receives extension data. Any separate
research/pilot feedback collection requires its own explanation and retention terms.
