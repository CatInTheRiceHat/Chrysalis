# Chrysalis privacy explanation

Applies to local preview 0.7.1. Updated 2026-09-07.
Chrysalis is independent and is not affiliated with or endorsed by YouTube or Google.

## What stays on your device

Chrysalis uses Chrome's local extension storage for:

- Preferences: appearance, viewing controls, indicator display, introduction status,
  default durations, checkpoint prompts and whether Chrysalis is paused.
- Your current session: intention (up to 80 characters), original/current target,
  explicit target changes, session state, dates, measured foreground YouTube time,
  break deadline and measured wall-clock break duration.
- Up to 100 completed session summaries with those details and an optional
  Yes/Partly/No reflection and note (up to 500 characters). Skip leaves no answer.
  Each record keeps up to 100 target revisions and an omitted-revision count.
- Technical state for reliable timing and duplicate protection: session IDs,
  revision counters, up to 64 recent command receipts (which can include the plan),
  and up to 32 recent document sequence markers. A timing anchor can include
  browser tab/window/document identifiers and timestamps. A temporary browser-epoch
  identifier distinguishes a worker wake-up from a browser restart. These are not
  advertising identifiers and are not shared with us.

There is no age-based deletion. Finishing a session removes summaries beyond the
latest 100. Preferences remain until changed or reset. Technical records are bounded
and replaced or cleared as sessions and browser lifecycles change.

## What the extension accesses, and why

On `https://www.youtube.com`, Chrysalis reads page structure and relevant link paths
to identify supported Home, related-video and Shorts entry points and apply your
chosen visibility controls. It uses the page address to recognize supported pages.
It checks tab visibility and browser focus to measure foreground YouTube time.
Browsing counts as well as playback; this is not exact watch time or attention.

Chrysalis does not store video titles, video URLs, search queries, transcripts,
account identities or a video browsing history. It does not access your account
through OAuth or use the YouTube Data API. Chrome may describe its website access
as permission to read and change data on YouTube; that access supports these page
controls and the indicator, not an integration with Google's account system.

## Sharing and security

No session data, preferences, reflections or notes are uploaded by Chrysalis.
There are no analytics services, remote logging, advertising, accounts, cloud sync
or AI processing. Its executable code, fonts and artwork are bundled locally.
The developers cannot remotely read your extension storage. YouTube and Chrome
continue to operate under their own policies; this explanation covers Chrysalis.

**Your current intention appears in YouTube's page when the indicator is expanded.**
The page can read that displayed text. Avoid private details and turn off “Show
session indicator” if you do not want it displayed. Collapsing is not a privacy
boundary. Reflections and notes are shown only in trusted extension pages.

Local storage is restricted to trusted extension contexts but is **not encrypted
by Chrysalis**. Someone with access to your Chrome profile/device may be able to
read it. Device backups may retain copies outside Chrysalis's control.

Chrysalis limits use of locally handled information to the disclosed session and
viewing-control purpose. It does not sell, transfer for advertising, or use it for
credit decisions. This is its Limited Use commitment; it is not a claim of Chrome
Web Store approval or a security certification.

## Your controls

You can edit a plan, pause Chrysalis, hide its indicator, skip reflection, and
add/edit/clear a reflection later. In settings, delete one history record, clear all
history, or separately delete all Chrysalis data. Clear history keeps an unfinished
session and preferences; Delete all also clears them and restores defaults.
Deletion retains only default settings and non-personal counters needed to reject
old commands. Neither action changes your YouTube account or YouTube history.
Use Chrome's Extensions page to disable or remove Chrysalis. There is no export
feature, remote backup or automatic repair of malformed data in this preview.

## Voluntary pilot feedback

The extension does not send pilot feedback. If you choose to contact the person
who supplied it, share only feedback you want them to receive. You do not need to
send video details, browsing history, session records, screenshots or personal notes.
Any separately shared feedback is handled by the pilot organizer, not this extension;
the organizer should explain that channel and its retention before collecting it.
For this local preview, use the channel through which you received the files for
questions. A verified public publisher/contact and hosted policy URL must be supplied
before a store submission; none is invented here.
