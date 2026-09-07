# Chrysalis Chrome extension

A Manifest V3 extension for desktop YouTube with optional session planning,
foreground-time awareness, editable targets, pause/resume, deliberate checkpoints,
voluntary breaks and local session summaries. Popup, settings and a removable
indicator share worker-owned state. Reversible controls optionally hide supported
Home/watch recommendations and Shorts entry points. **Reflection and history/deletion
management UI remain for later stages.**

Start from the toolbar popup or settings page: choose Studying, Watching a specific
video, Entertainment, Exploring, or a custom intention. Choose a preset/custom
target or No time target. Edit during a session; Finish shows original target,
final target and measured duration. More time is a choice, not a failure.

Expand **Your viewing layout** in the popup or open settings for three independent
toggles, initially off. **Restore ordinary layout** turns all three off.
[Viewing-control scope and live/fixture evidence](VIEWING_CONTROLS.md) distinguishes
supported surfaces from unfamiliar layouts; Shorts URLs remain usable.

Read [the session model](SESSION_MODEL.md) for allowed transitions, timing,
reconciliation, privacy and measurement limits.

## Build and load

From the repository root, with Node 20+ and npm:

```sh
cd extension
npm ci
npm run check
```

`check` runs unit tests, strict TypeScript checking, the production build and
generated-file verification. Individual commands:

```sh
npm run typecheck
npm test
npm run build
```

**Unpacked output:** `extension/dist/`, absolute path in this workspace:
`/Users/elaine/Documents/Chrysalis/extension/dist`.

1. In desktop Chrome (111+), open `chrome://extensions`.
2. Enable Developer mode, select **Load unpacked**, and select **`extension/dist`**.
3. Pin Chrysalis from the extensions menu and open its popup.
4. Open or refresh `https://www.youtube.com/`. The indicator appears at bottom left.
5. After source changes, run `npm run build`, click Reload on the extension card,
   and refresh open YouTube tabs. Never load `src/` or the parent `extension/`.

No backend, API key, account, OAuth, dev server or environment file is required.
Installation downloads development dependencies; packaged code/assets run locally.
The build empties only this package's generated `dist/` directory.

## Stack and package structure

Framework-free HTML/CSS and TypeScript, with esbuild for three local bundles:
`background.js` (module worker), `page.js` (popup/settings module), `content.js`
(isolated-world IIFE). No runtime dependencies. TypeScript/esbuild refine the
transition plan's plain-JS proposal because this stage requests shared types,
a typed protocol and a reproducible production output; no application framework
or root workspace changes were needed.

| Source | Responsibility |
| --- | --- |
| `static/manifest.json`, `scripts/build.mjs` | MV3 configuration and production package |
| `static/popup.html`, `static/options.html`, `static/styles.css`, `src/ui/page.ts` | Accessible labeled settings, theme and connection status |
| `src/shared/types.ts`, `validation.ts` | Session/settings contracts, validation and schema upgrade |
| `src/session/model.ts`, `src/ui/session.ts` | Session transitions, timestamp accounting and planning controls |
| `src/shared/storage.ts` | Storage adapter, queued mutations, revision checks and non-destructive errors |
| `src/shared/protocol.ts`, `handler.ts`, `client.ts` | Typed requests/replies, runtime validation and sender authorization |
| `src/background.ts` | Sole writer, synchronous listener registration and settings notifications |
| `src/content/` | Supported-origin check, session indicator, isolated YouTube adapter and reversible viewing-control lifecycle |
| `tests/`, `scripts/verify-build.mjs` | State/data/security tests, real-browser tests and generated-asset checks |

## Permissions, security and local data

| Manifest capability | Why this implemented feature needs it |
| --- | --- |
| `storage` | Persist settings, session state and summaries in `chrome.storage.local`; retain a browser epoch in `chrome.storage.session` to distinguish worker suspension from browser restart. |
| Static match `https://www.youtube.com/*` | Observe foreground visibility, show session/control status and apply optional scoped visibility rules on that exact desktop origin, top frame only. This grants page access for this origin; it is not all-sites access. |

No separate host permissions, `tabs`, `scripting`, `activeTab`, history, cookies,
identity, notifications or network permissions are requested. Incognito is
explicitly disabled. The worker enumerates only tab IDs to notify this extension's
existing content scripts when preferences change; it does not inspect URLs/titles
for these notifications. Session accounting retains bounded internal ownership IDs as described below. Pages without the script have no receiver.

Executable code, CSS, logo and fonts are bundled locally. Extension-page CSP
allows local scripts/styles/fonts/images only and forbids network connections,
objects and framing. No remote code, inline executable scripts, `eval`,
web-accessible resources, external messaging, or webpage `postMessage` bridge.
[Chrome CSP documentation](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy).

Messages use channel `chrysalis/v1` and discriminated request/reply types:

| Message | Allowed sender | Effect |
| --- | --- | --- |
| `PING` | Own popup/options or top-frame YouTube content script | Returns extension version; no storage mutation. |
| `GET_SETTINGS` | Same | Returns display settings and settings revision only. |
| `GET_SNAPSHOT` | Own popup/options only | Reads session/summary state and reconciles recovery or break expiry. |
| `GET_DISPLAY` | Own popup/options or YouTube content | Sanitized phase/elapsed/target display, without intention/history. |
| `SESSION` | Own popup/options only | Validated command with request ID, expected session ID and session revision. |
| `OBSERVE` | Own active top-frame YouTube document only | Validated visibility/clock sample; worker verifies Chrome foreground eligibility. |
| `UPDATE_SETTINGS` | Own popup/options only | Applies a validated settings patch if `expectedRevision` matches. |
| `SETTINGS_CHANGED` | Worker to its content scripts | Updates indicator visibility/theme/session display; receiver verifies sender and snapshot sequence. |

The worker checks extension ID, exact extension page URL or top-frame YouTube
origin, and message keys/types. Content cannot write settings or request private
session data. Chrome local storage access is restricted to `TRUSTED_CONTEXTS`
before reads/writes; content uses sanitized messages instead. Content observations cannot start, edit, pause or finish sessions.
[Chrome messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging),
[Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage).

Storage key: **`chrysalis.extension.v1`**, now **schema version 3**. Valid schema-1/2
extension data upgrades locally without resetting preferences or reserved records.
Shared types cover settings/revisions, current session, completed summaries,
command receipts and timing metadata. Unknown/corrupt versions remain untouched.
No other application database or user data is read or migrated.

The worker serializes operations and reads persisted state inside the queue.
Session commands use expected revisions/IDs and retained request receipts, so
retries cannot double-finish or overwrite a newer session. Settings use a separate
revision. Failed writes do not report success or poison the queue. Initialization
and event registration support worker restart; no permanent in-memory state is
required. A Chrome session-storage epoch detects browser restart and restores
unfinished sessions paused. [Chrome worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

Timing uses one owner and timestamped foreground observations, roughly every two
seconds plus lifecycle boundaries. Only the active YouTube tab in the focused
window contributes, including browsing and playback. Long gaps over five seconds
are excluded and pause for recovery. No background interval is the source of truth.
See [timing details and limitations](SESSION_MODEL.md).

Local data contains intention, original/final targets, measured duration and dates,
the latest 100 completed summaries, and bounded internal ownership/receipt metadata.
No URLs, titles, search terms, account IDs, cloud sync or telemetry. Internal IDs
support accounting and reset on restart/finish; they are not copied into summaries.
Custom intentions and history remain on extension pages; page indicators only see
sanitized timing state. Incognito remains disabled. Uninstall removes local data.

## Indicator lifecycle and branding

One isolated-world controller owns one shadow-root indicator. Reinitialization
disposes the earlier controller/listeners. Setting the indicator off removes its
host immediately; turning it on recreates one. The close button dismisses it for
the current document; reload or off/on restores it. Page teardown removes its host
and listeners; back/forward-cache restoration and YouTube navigation refresh state.
A separate, filtered DOM observer runs only with viewing controls enabled; it
coalesces support-status checks while CSS handles insertion. Content observation
timeouts run while a session is active/checkpoint; popup polling only reads state. Shadow DOM isolates styles, not secrets.

Chrome can invalidate content scripts when an extension is reloaded/disabled;
existing pages may need refresh to remove stale injected UI. Use the indicator
toggle and Restore ordinary layout before disabling for immediate cleanup. If the extension context is gone,
the next refresh attempt removes the indicator. An inactive page is not guaranteed
an immediate invalidation callback. Optional viewing controls change recognized elements’ visibility; player state is untouched.

Logo and icon reuse the existing 100×100 `website/public/images/logo.png` unchanged;
Chrome scales this valid PNG for its UI. This is real existing Chrysalis branding,
not the Flutter starter icon. Dedicated 16/48/128 pixel exports and Web Store
artwork remain a distribution task. The interface labels this build **Early preview**.
Abril Fatface and Montserrat are copied from `intentional_social/assets/fonts/`
with their OFL license files. No externally loaded fonts.

## Browser checks and manual verification

Install the isolated test browser once, then run:

```sh
npx playwright install chromium
npm run test:browser
```

The test loads the real unpacked extension into a temporary persistent Chromium
profile and deletes that test profile afterward. It uses a controlled HTML fixture
at the supported YouTube origin, real extension APIs and the real content-script
isolated world. The viewing suite separately checks toggle persistence, two-tab updates, late
rendering, protected/unknown content, restoration and observer cleanup on fixtures.
The additional session suite tests foreground accounting, window
focus, multiple tabs, plan edits, pause/break/checkpoint/finish and restart recovery. It checks pages, popup reopen, settings synchronization, messaging,
sender/storage restrictions, repeated initialization, SPA navigation, dismissal,
worker stop/wake, browser restart and an unrelated origin. Generated report and
screenshots: `extension/test-results/` (ignored).

For a separate signed-out live YouTube smoke check as well:

```sh
LIVE_YOUTUBE=1 npm run test:browser
npm run test:viewing:live
```

Playwright uses its bundled Chromium with a temporary profile because regular
Chrome restricts command-line extension sideloading. The popup HTML is opened as
an extension page; the native toolbar click/popover is a manual check.
[Playwright extension testing](https://playwright.dev/docs/chrome-extensions).

Manual verification in your installed desktop Chrome:

1. Follow Load unpacked above; check the extension card for errors.
2. Click its actual toolbar icon: verify popup layout and “Extension connected”.
3. Change appearance, close/reopen the popup, and verify the selection persists.
4. Open settings from the popup. Toggle the indicator off/on with two YouTube
   tabs open; verify zero/one indicator per tab and unchanged YouTube controls.
5. Navigate Home → a video → Back and refresh. Verify no duplicate indicators;
   dismiss with the × button and confirm reload restores it.
6. Check a non-YouTube page and a YouTube iframe on another site: no indicator.
7. Expand Your viewing layout. Test each toggle on Home/watch pages, navigate to
   search/subscriptions and check content/player/ads remain usable. Toggle off or
   Restore ordinary layout; inspect the in-page disclosure for unsupported surfaces.
8. Start a session, edit its target and verify the original target stays visible.
   Switch tabs/windows, pause/resume and take/end a break; elapsed time should
   follow the foreground contract. Finish and inspect the summary.
9. Restart Chrome during an active session; it must restore paused, with no time
   added for the closure. Check keyboard focus and device
   theme behavior; test page zoom and fullscreen player placement.

See `../docs/extension-implementation-status.md` for the latest recorded results
and next stage. Physical sleep, native toolbar popover interaction, screen readers and exhaustive YouTube/player layout coverage still need manual verification.
