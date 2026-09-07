# Chrysalis Chrome extension

A local Manifest V3 extension for intentional desktop YouTube sessions. Start with
an intention, leave time open or choose a target, revise the plan, pause, continue,
take a break or finish. Optional viewing controls hide supported recommendation
surfaces. Entertainment and exploration are valid choices.

The skippable introduction explains scope and privacy. The popup shows your session;
settings organize viewing controls, session defaults, checkpoints and data deletion.
The collapsible YouTube indicator shows the current intention and **foreground
YouTube time**, with session actions, outside the player. Reflection and history
browsing remain later-stage work; local summaries and deletion are implemented.

## Install, check, build and load

From the repository root, using Node 20+ and npm:

```sh
cd extension
npm ci
npm run check
```

`check` runs 40 Node tests, strict TypeScript, the production build and generated-file
verification. Individual commands: `npm test`, `npm run typecheck`, `npm run build`.
The build empties only this package's generated `dist/` directory.

**Unpacked output:** `extension/dist/`, or
`/Users/elaine/Documents/Chrysalis/extension/dist` in this workspace.

1. Open `chrome://extensions` in desktop Chrome (111+) and enable Developer mode.
2. Select **Load unpacked** and choose **`extension/dist`**. Pin Chrysalis.
3. Open the popup; choose Get started or Skip introduction. Start a session when
   you want one. Viewing preferences opens settings; all hiding controls default off.
4. Open/refresh `https://www.youtube.com/`. On watch pages the indicator is below
   the player; on Home it occupies its own row. Collapse it when you want less UI.
5. After building changes, Reload the extension card and refresh YouTube tabs.
   Do not load `src/` or the parent `extension/` directory.

No backend, account, OAuth, API key, environment file or dev server is needed.

## Architecture and permissions

Framework-free TypeScript/HTML/CSS, esbuild, no runtime dependencies. Three local
bundles: module worker `background.js`, extension-page `page.js`, isolated-world
content script `content.js`. The original React/Python/Flutter applications remain
independent. Real branding/fonts are reused with their licenses; this is Early preview.
Chrome scales the existing 100px PNG icon. Store-specific icon exports remain pending.

| Source | Responsibility |
| --- | --- |
| `src/shared/` | Typed protocol, runtime validation, sender checks, schema upgrades and queued storage |
| `src/session/model.ts` | Session transitions, targets, timestamp accounting and recovery |
| `src/background.ts` | Sole writer, synchronous listeners, native tab/window signals and fixed extension-page opening |
| `src/ui/page.ts`, `session.ts` | Introduction, preferences, confirmation dialogs and session UI |
| `src/content/youtube-adapter.ts` | YouTube routes, selectors, supported surfaces and placement anchors |
| `src/content/indicator.ts`, `dock.ts`, `viewing-controls.ts` | In-flow session/status UI, shared placement lifecycle and reversible CSS |
| `tests/`, `scripts/` | Domain/security/browser tests, build and generated-file checks |

| Manifest capability | Implemented reason |
| --- | --- |
| `storage` | Settings, session and summaries in `storage.local`; a browser epoch in `storage.session` distinguishes worker suspension from browser restart. |
| Static top-frame match `https://www.youtube.com/*` | Observe foreground visibility, display session/control UI and apply optional scoped visibility rules on this exact desktop origin. |

No additional host permissions, `tabs`, `scripting`, `activeTab`, history, cookies,
identity, notifications or backend access. Incognito is disabled. Enumerating tab IDs
for updates and opening a fixed local extension window need no broad page access.
[Chrome windows API](https://developer.chrome.com/docs/extensions/reference/api/windows).
All executable code, fonts and assets are local. No remote code, `eval`, webpage
`postMessage` bridge, external messaging or web-accessible resources. The CSP forbids
network connections and remote scripts in extension pages.

## State, timing and privacy

Storage key **`chrysalis.extension.v1`**, current **schema 4**. Valid older extension
schemas upgrade without losing settings/plans; unknown/corrupt data stays untouched.
The worker serializes mutations, awaits writes, and rejects stale revisions/IDs.
Session receipts prevent duplicate completion. Delete all retains only defaults and
non-personal counters/epoch metadata needed to reject delayed old writes.

Time includes browsing and playback in one active YouTube tab in the focused browser
window. It excludes hidden tabs, unfocused windows, pauses and breaks. Observations
arrive about every two seconds; timestamps and lifecycle events are authoritative.
Gaps over five seconds are excluded and pause for recovery. Browser restart restores
unfinished sessions paused. This is not exact watch time, attention or productivity.

Plans, dates, measured durations and the latest 100 summaries remain local. No
video titles, URLs, searches, account IDs, sync or telemetry are recorded.
**The current intention appears on YouTube and can be read by the page.** Avoid
private details; settings can hide the indicator. Collapse is not a privacy boundary.
History and arbitrary plan/data changes remain restricted to extension pages.

Content UI can send constrained session commands and open fixed Chrysalis surfaces
through validated messages; its handlers require trusted user clicks. It cannot
change settings, read full snapshots, delete data or directly read Chrome storage.
Chrome local storage is restricted to trusted extension contexts.
[Chrome messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging),
[Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage).

Detailed contracts: [experience/accessibility/privacy](EXPERIENCE.md),
[session transitions and timing](SESSION_MODEL.md),
[viewing controls and support evidence](VIEWING_CONTROLS.md).

## Browser checks

```sh
npx playwright install chromium
npm run test:browser          # four suites: foundation, session, viewing, experience
npm run test:experience       # experience fixtures only
npm run test:experience:live  # actual signed-out Home/watch placement and actions
npm run test:viewing:live     # separate live viewing-control checks
```

Tests load the unpacked extension into disposable Playwright Chromium profiles.
Controlled YouTube-origin fixtures use real extension APIs, native focus/tab events,
fullscreen and Chrome tab zoom. Live tests are separate; fixture selectors are not
presented as verified live support. Reports/screenshots go to ignored `test-results/`.
The toolbar popup HTML is opened as an extension page; a native toolbar click is
still a manual check. [Playwright extension testing](https://playwright.dev/docs/chrome-extensions).

Manual checks: load through installed Chrome's toolbar, navigate by keyboard, try
screen readers, browser zoom, fullscreen/theater/miniplayer and signed-in YouTube
layouts. Verify captions/player/search/navigation remain usable. Unknown layouts
stay usable; where no safe dock exists, use the extension popup. Restore ordinary
layout before disabling if immediate control cleanup is needed; refresh existing
YouTube tabs after extension reload/disable for guaranteed stale-script cleanup.

Latest completed checks, limitations and next stage:
[implementation status](../docs/extension-implementation-status.md).
