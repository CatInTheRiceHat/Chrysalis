# Chrysalis — intentional social prototype

A runnable Flutter app for setting session intentions, understanding a sample feed, and choosing how to spend time. Longer sessions are not treated as failure. The app makes no mental-health claims.

This app is independent of the React/Python application in the parent repository. It does not connect to that application's API, database, authentication, or analytics.

## Run

Tested with **Flutter 3.47.2 / Dart 3.13.2**. Install Flutter using the [official instructions](https://docs.flutter.dev/install), then:

```sh
cd intentional_social
flutter pub get
flutter run -d chrome
```

The SDK installed for this workspace is currently at `/tmp/chrysalis-flutter-sdk`. If Flutter is not on your PATH, use `/tmp/chrysalis-flutter-sdk/bin/flutter` in the commands above. This temporary SDK location may be removed by the operating system; use a permanent Flutter installation for ongoing development.

Android and iOS project scaffolds are included. With the appropriate Android SDK/emulator or Xcode/iOS simulator installed, run `flutter devices` and `flutter run -d <device-id>`. No account, backend configuration, API keys, or runtime permissions are required.

To serve a release web build with its rendering resources included locally:

```sh
flutter build web --release --no-web-resources-cdn
python3 -m http.server 8765 --bind 127.0.0.1 --directory build/web
```

Open http://127.0.0.1:8765. Development dependencies need internet for initial installation; the release app uses bundled content, fonts, artwork, and renderer resources. It sends no analytics or application data over the network. A service worker/offline-install cache is not included; the web app's static files still need a reachable local server when first opening or reloading.

## Visual reference: the existing feed

This Flutter interface follows the actual React feed, not the marketing pages. The references are `website/src/reels.css`, `components/reels/ReelCard.jsx`, `ReelCaption.jsx`, `ReelActionRail.jsx`, `AppSidebar.jsx`, and `ChrysalisTopBar.jsx` in the parent project.

It uses the feed's Abril Fatface headings, Montserrat body, Story Script topic tags, exact existing logo, warm-white background (`#faf9f6`), muted purple accent (`#7c6d8c`), and deep dark theme (`#161320`). Small secondary text is slightly darker than the site's muted token for contrast. Desktop places the caption beside a tall 28px-radius media frame and circular action rail. Mobile places the title and author over the media, with the full text behind Read post.

The media remains bundled fictional sample artwork. It does not fetch the original site's YouTube videos or copy its behavioral ranking, authentication, or health claims. The prototype retains finite post batches, explicit time choices, and locally stored history. Session controls open from a compact button instead of occupying a permanent content column.

## Working experience

- **Session setup:** four intentions; 5, 15, and 30-minute presets; custom 1–1440 minutes; no time goal; or skip setup. Setup choices become next-session defaults. Edit the current intention or total time goal through Session controls.
- **Feed:** 12 original fictional posts with local vector artwork, up to ten at a time, an explicit Load more choice, and a final endpoint. The first batch contains ten posts; Load 2 more reveals the remaining sample posts. Appreciation is temporary feedback for this visit and does not affect recommendations.
- **Visible recommendations:** followed accounts receive +2 priority, selected topics +1. Higher totals come first, then newest publication order, then stable ID. The fixed sample follows are Maya Chen, Jules Rivera, and Sam Okafor. Chronological order ignores follows and topics. Every explanation uses these actual rules; there is no AI, behavioral ranking, or watch-time input.
- **Preferences:** edit topic/order drafts, compare current and proposed first-four-post previews, then apply. Undo the last applied change through the button or snackbar. Undo is available during the current app visit. Preview drafts are discarded when leaving Preferences. Topics prioritize rather than filter.
- **Time choices:** pause/resume/end from the persistent session strip. A single calm dialog appears when active time reaches a goal; choose End session, Take a break, Add time, or Keep browsing. Dismissing it does not repeat the prompt for the same goal. A new extension can produce a new prompt when its time is reached.
- **Breaks:** matching mode is off by default. Choose the experimental “Match your break to your time spent” rule, a custom usual break, or Off in Preferences. Breaks always require an explicit choice. Matching uses actual cumulative active time at the moment the break begins, including time used after extensions. Custom breaks are always available. Adjust remaining break time or end early. Breaks mean time away from this app; other apps and time off the phone are not monitored.
- **Reflection/history:** ending immediately saves intention, original planned duration, final time goal, and actual active duration. Yes / Somewhat / No / Skip are optional. History can be cleared, including reflections, without resetting preferences or an ongoing session.
- **Accessibility:** standard Material controls, semantic labels, tooltips, described artwork, generous touch targets, light/dark/system appearance, and layouts checked at 375px with 200% text. No decorative motion or meaning conveyed only through color.

## Timer contract

`SessionEngine` is independent of widgets and accepts an injectable monotonic clock and wall clock.

| Situation | Active session time | Break time |
| --- | --- | --- |
| Foreground + running | Accumulates using monotonic elapsed time | — |
| Inactive, hidden, paused, background, or detached | Does not accumulate | Deadline continues |
| Manual session pause | Does not accumulate | — |
| Break | Does not accumulate | Wall-clock deadline continues |
| Break expires or ends early | Remains paused until explicit Resume | Completes |
| App/browser restarts | Restores an active session as paused | Restores deadline; expired break becomes paused |
| Add time after goal | New goal is actual elapsed + extension | — |
| Add time before goal | Adds to remaining time | — |

The timer updates once per second but accounts for actual clock deltas, rather than assuming each tick is exactly one second. Lifecycle transitions account for the foreground interval before stopping. An untouched goal dialog leaves the session running, so time spent deciding counts. Editing the goal preserves the original planned duration in history; the final goal includes changes and extensions.

## Local data

`SharedPreferencesAsync` stores a versioned snapshot under `chrysalis.intentional.v1`. Writes are serialized so an earlier checkpoint cannot overwrite a later history deletion. State checkpoints are saved every active-session second and on lifecycle changes and user actions. Read/write errors are shown in the interface; a failed write does not silently claim persistence.

On the web this uses the current browser profile's local storage. On mobile it uses platform preferences. This is not an encrypted vault: someone with access to the same device/browser profile can potentially inspect the data. Android application backup is disabled. Platform-level device backups remain subject to OS settings, especially on iOS. Clear history removes app-stored records, not any prior external device backups.

## Verify

```sh
flutter analyze
flutter test
flutter build web --release --no-web-resources-cdn
```

The tests cover foreground/background accounting, manual pause, late extensions, one-time goal prompting, matching breaks with extensions, break adjustment/early ending/expiry, restart recovery, reflections, serialized history deletion, persistence errors, deterministic recommendations, draft preview/apply/undo, custom-duration validation, the feed endpoint, and narrow layouts with large text.

## Structure

- `lib/domain/session.dart`: clock-injected session state machine and session records.
- `lib/domain/feed.dart`: deterministic ordering, preference model, and truthful explanations.
- `lib/domain/app_controller.dart`: observable state, lifecycle entrypoints, and serialized checkpoints.
- `lib/data/`: local storage adapter and original sample profiles/posts.
- `lib/ui/`: responsive shell, session controls, feed, preferences preview, history, theme, and vector artwork.
- `test/`: domain, persistence-controller, and widget flow tests.

## Remaining limitations

- This is a finite social prototype: no real profiles, editable following list, posting, messaging, or cloud sync. Appreciation resets when the post widget is recreated.
- Native iOS/Android scaffolds are included, but native builds and physical-device VoiceOver/TalkBack behavior have not been verified in this workspace. Automated widget tests and Chrome validate the shared experience, not all platform behavior.
- Preference storage is best-effort, not a transactional database. Abrupt termination can lose time since the last completed checkpoint (normally around one second, potentially longer if storage is delayed). Restart never estimates active use during the missing interval. Clearing browser site data or uninstalling removes local data.
- Active time means foreground + running, including the app's settings and dialogs. It cannot detect attention or other apps. Multiple simultaneous browser tabs are unsupported; use one tab to avoid last-writer conflicts.
- Break deadlines follow wall time so they survive restarts. Manually changing the device clock can change the remaining break duration. There are no notifications, alarms, background services, phone lockouts, or monitoring permissions; an expired break is reflected when the app next updates/resumes.
- Undo is one level and lasts for the current visit. The preview shows the first four posts; applying a preference change resets pagination to the first ten-post batch.

Fonts: bundled **Abril Fatface**, **Montserrat**, and **Story Script**, distributed under the SIL Open Font License. License files are in `assets/fonts/`. Artwork and fictional sample text are original to this prototype.
