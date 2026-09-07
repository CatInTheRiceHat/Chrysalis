# Chrysalis: desktop YouTube extension transition

Audit: 2026-09-07. **Recommendation:** add an independent `extension/` using
Manifest V3, plain JavaScript, HTML and CSS. Preserve both current applications.
This stage only inspects and documents; extension designs below are proposals.

## 1. What exists today

### Repository and instructions

- Intended repository: `/Users/elaine/Documents/Chrysalis`, branch `main`.
  At audit start, the only working-tree change was untracked
  `docs/extension-implementation-status.md` from the preceding stage.
- No filesystem `AGENTS.md` found in the repository or checked ancestor paths.
  The user supplied AGENTS instructions in conversation. Root `CLAUDE.md` and
  `.github/copilot-instructions.md` describe the earlier feed project; the new
  brief governs this transition. Copilot's dependency/entrypoint descriptions
  disagree with actual files. Numerous tracked ` 2` filename variants exist;
  leave them untouched.
- Structure: `website/` React app; `intentional_social/` Flutter app; `api.py`,
  `api/`, `core/`, `integrations/` Python services; `migrations/`, `supabase/`,
  `supabase_schema.sql` database assets/configuration; `tests/`, `scripts/`,
  `datasets/`, `docs/`, `archive/`, `screenshots/` supporting material.

### Source-backed components

| Component | Evidence and finding |
| --- | --- |
| Web frontend | `website/src/main.jsx`, `website/src/App.jsx`: React Router/AuthProvider; `/` renders ReelsPage, `/reels` redirects there. Saved, profile, diagnostic, challenges and research routes exist. Several social routes redirect to `/`; component presence does not establish an active route. |
| Feed/backend | `website/src/components/reels/ReelsPage.jsx` requests feed batches. `core/ranking/feed.py`, `core/ranking/modes.py`, `integrations/youtube_ingest.py` implement ranking/ingestion. `api.py` is FastAPI/SQLite; `api/index.py` is FastAPI/PostgreSQL using psycopg2 and `DATABASE_URL`. Both register `research_api.py`. |
| Authentication | `website/src/lib/supabaseClient.js`, `AuthProvider.jsx`: configured Supabase client, persisted sessions, email/password, Google OAuth and password recovery. `profileApi.js` handles profiles and avatar uploads. |
| Database | `core/database.py` resolves SQLite paths; `chrysalis.db` and `integrations/chrysalis.db` exist. `migrations/010_profiles.sql` defines profiles/access policies/avatar storage; `013_usage_events.sql`, `015_research_sessions_and_events.sql`, `016_research_feed_policies.sql` define further server data. Files establish intended schema, not live migration status. Database contents and credentials were not read. |
| Deployment | `vercel.json` builds `website/dist`, routes APIs to `api/index.py`, and declares two `/api/cron/drop` schedules. `.github/workflows/youtube-feed-ingest.yml` schedules ingestion four times daily using repository secrets. Live deployments and secret availability were not checked. |
| Web intention/breaks | Under `website/src/components/reels/`: `OnboardingStartScreen.jsx` chooses an algorithm mode, not a duration plan; `useSessionTimer.js` counts visible/focused feed time; `sessionBreaks.js` escalates suggestions at 60/90/120/150 minutes; `BreakScreen.jsx` offers an optional countdown but requires activity selection to return. These rules differ from the extension brief. |
| Web reflection/analytics | `website/src/components/reels/useReflections.js` persists per-video snapshots/reflection labels in localStorage. `useSessionTimer.js` retains up to 50 break completions. `website/src/lib/events.js` uploads authenticated usage events to Supabase; `researchEvents.js` queues and uploads participant/session/post/break events. This is not extension-local session history. |
| Flutter session features | `intentional_social/lib/domain/session.dart`: injected clocks, optional/editable target, original plan, one-time goal acknowledgement, extensions, pause/resume, voluntary breaks, restart-as-paused, session history and reflection. `lib/ui/session_controls.dart`, `shell.dart`, `feed_page.dart`, `history_page.dart` expose these features and history deletion. |
| Flutter persistence | `intentional_social/lib/data/app_store.dart` saves versioned JSON through SharedPreferencesAsync. `lib/domain/app_controller.dart` serializes writes, surfaces failures and holds theme/break/default-plan preferences. `lib/main.dart` connects lifecycle changes and ticker disposal. Source/dependency inspection found no application network or analytics integration. |
| Flutter feed/native | `intentional_social/lib/domain/feed.dart`, `lib/data/sample_posts.dart`, `lib/ui/feed_page.dart` implement a bundled sample feed with explicit batches. `android/` and `ios/` contain Kotlin/Gradle and Swift/Xcode scaffolds. This app is separate from React/Python. |
| Branding/UI | `website/src/brand.js`, `website/src/reels.css`, `website/src/components/reels/ChrysalisTopBar.jsx`, `ThemeToggle.jsx`: name, warm-white/plum palettes, typography, compact intention display and labeled controls. Flutter `intentional_social/lib/ui/theme.dart` adapts these tokens. `website/public/images/logo.png` and `intentional_social/assets/brand/logo.png` have identical SHA-256 hashes. Bundled fonts and OFL licenses exist in `intentional_social/assets/fonts/`. |
| Browser extension | No implementation found by file inventory and searches for `manifest_version`, extension URLs and Chrome/browser runtime/storage APIs, excluding generated/dependency files. `intentional_social/web/manifest.json` is a standalone web-app manifest, not a Chrome extension manifest. |

### Toolchains and commands

These are source-backed entrypoints, **not checks passed in this audit**.

| Package | Stack/package manager | Build/run/testing |
| --- | --- | --- |
| `website/` | JS/JSX, CSS, React 19, Vite 5, React Router 6, Tailwind/PostCSS, Supabase, Motion, Lucide and media/graphics libraries. npm: `package.json`, `package-lock.json`; `vite.config.js`, `eslint.config.js`. | `npm ci`; `npm run dev` (configured port **6767**); `npm run build`; `npm run lint`; `npm run test:unit` (Node test runner). `npm run qa:feed-batches -- <url>` and `npm run qa:responsive -- <url>` use Playwright and require a running app/browser. |
| Python root | Python/SQL, FastAPI, Uvicorn, Pydantic, pandas/NumPy, APScheduler, psycopg2, pytest. pip via `requirements.txt`; no Python dependency lock found. | `python -m pip install -r requirements.txt`; `python api.py` (8000). Instructed test command: `.venv/bin/python -m pytest -q`. `tests/` covers ranking, ingestion, research/storage and other feed behavior. |
| `intentional_social/` | Dart/Flutter, Material, shared_preferences; Flutter/pub via `pubspec.yaml` and tracked `pubspec.lock`. | `flutter pub get`; `flutter run -d chrome`; `flutter analyze`; `flutter test`; `flutter build web --release --no-web-resources-cdn`. `test/session_test.dart`, `controller_test.dart`, `widget_test.dart`, `feed_test.dart` contain lifecycle, recovery, deletion-ordering, storage-failure, UI and feed cases. |

Observed tools: Node 20.17.0, npm 10.8.2, Python 3.13.1;
`website/node_modules` exists. Flutter is absent from PATH but an executable
exists at `/tmp/chrysalis-flutter-sdk/bin/flutter`; its version was not checked.
The instructed `.venv/bin/python` and `.venv/bin/python3.13` are absent.
`.python-version` requests 3.12 while `CLAUDE.md` names 3.13.

## 2. Reuse / adapt / leave in place

| Material | Decision | Treatment |
| --- | --- | --- |
| Name, logo, licensed bundled fonts | Reuse selectively | Copy needed assets with font licenses; verify toolbar-size legibility. |
| `website/src/reels.css`, Flutter `lib/ui/theme.dart` | Adapt | Extract a small token set and check contrast; do not inject the full feed CSS. |
| Flutter `lib/domain/session.dart` and session/controller tests | Adapt concepts/scenarios | Reimplement in pure JS with browser lifecycle and multi-tab rules. Dart is not directly reusable in this stack. |
| Flutter session/history/settings widgets; React top bar/theme toggle | Rebuild UI from references | Use semantic HTML/CSS. Flutter widgets require rebuilding; React components depend on application context. |
| Flutter serialized persistence | Adapt | Extension-owned writer, schema validation and stale-message rejection; Chrome storage replaces SharedPreferences. |
| React progressive breaks/per-video reflections | Leave in place | Extension gets voluntary session checkpoints/reflection without escalation or required activities. |
| Custom feeds, sample posts, ranking, social UI, challenges/streaks | Leave in place | Excluded from extension scope. |
| APIs, ingestion/API keys, Supabase auth/data, analytics, migrations, deployment | Leave in place | No extension dependency, data import, event upload, migration or deployment changes. |

## 3. Proposed extension directory and architecture

Use self-contained **`extension/`**, without converting the root into a workspace.
Plain JavaScript matches existing web code and Node tests; these compact forms
do not need React or Flutter. Start without a bundler or runtime dependencies.
An independent npm package provides test commands; add a browser-test development
dependency when needed.

```text
extension/                     # proposed; not created in this stage
  manifest.json                # MV3, action, options, static content scripts
  background.js                # module worker: state authority and messages
  domain/session.js            # pure transitions and clock accounting
  storage.js                   # validation, serialized writes, recovery
  content/youtube.js           # classic script: lifecycle/DOM adapter
  content/controls.js          # classic script: reversible section controls
  content/indicator.js         # classic script: compact shadow-root UI
  popup.html / popup.js        # start/edit/pause/finish, settings entry
  options.html / options.js    # controls, history, deletion, privacy
  styles/ / assets/            # packaged CSS and selected branding
  tests/                       # domain, storage, messages, DOM fixtures
  package.json / README.md     # independent tests and load instructions
```

- Worker owns transitions/writes; popup/content scripts send commands and render
  snapshots. Register listeners on startup and initialize stored state before
  commands. Do not depend on an open popup or persistent worker interval: Chrome
  can terminate idle workers and discard globals.
  [Official worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).
- Static content scripts run in the isolated world, top frame only, matching
  `https://www.youtube.com/*`. List classic scripts in manifest order; use modules
  for worker/extension pages. Shadow DOM isolates UI styles, not confidential
  data. Use owned markers/CSS for reversible hiding and bounded DOM observation
  for replaced sections/navigation. Expose only necessary assets to the page.
  [Official content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).
- Proposed permissions: `storage` and the narrow content-script match. No broad
  `tabs`, `scripting`, browsing history, cookies, identity, notifications or all-sites
  access. Use tab IDs/activation/window focus for ownership; most Tabs operations
  do not require the `tabs` permission. Verify the exact manifest/focus approach
  in Chrome before finalizing it.
  [Official Tabs permissions](https://developer.chrome.com/docs/extensions/reference/api/tabs).
- Validate message sender, top frame, origin, command shape, session revision and
  ownership. No external messaging or execution of page-supplied code/HTML. Only
  extension pages request history/deletion; content gets minimal current state.
  [Official messaging guidance](https://developer.chrome.com/docs/extensions/develop/concepts/messaging).

## 4. Systems needed; provisional session and privacy decisions

**Runtime:** desktop Chrome, extension APIs and YouTube's existing website.
**Development:** Node/npm for tests and a test browser. No existing backend,
database, Supabase, research service, Flutter runtime, Vercel, ingestion job or
YouTube Data API is needed.

The following are provisional defaults, subject to implementation verification:

| Situation | Proposed semantics |
| --- | --- |
| Start/planning | Merely visiting YouTube does not record a session. Offer explicit Start and Start without a plan. Intention/target are optional; unplanned means unset intention and no target. Include entertainment/exploration among valid choices. |
| Elapsed time | Count running-session time on a visible, active YouTube tab in the focused Chrome window, including browsing/paused video. This is foreground YouTube use, not attention or watch time. Background audio and PiP outside that tab do not count initially. |
| Multiple tabs | One session per normal Chrome profile, one foreground contributor. Switching YouTube tabs transfers ownership without creating a new session. With no foreground YouTube tab, stop accumulating but do not automatically finish. |
| Recovery | Use measured deltas, not tick counts; persist transitions/periodic progress. Document generations/sequence numbers reject replayed samples. Worker wake reconciles stored state; browser restart restores running sessions paused. Never infer active use over unobserved sleep/crash/discard gaps. Heartbeat/stale-gap thresholds and loss bounds need tests. |
| Targets/checkpoints | No target means no automatic time checkpoint. At target: Continue, Finish or Break, without blocking YouTube or automatically stopping time. Dismiss/Continue acknowledges that target once. A changed target/extension may rearm; late extensions start from actual elapsed. Retain original and final targets. |
| Pause/break/finish | Pause session stops timing. Pause Chrysalis also restores hidden sections and suppresses prompts until resumed, retaining settings. Break is voluntary, user-timed and endable early; expiry leaves paused. Finish saves once before optional reflection, without closing tabs. Propose best-effort video pause on explicit Break/Finish only, never automatic replay; verify later. |
| Viewing controls | Off by default, independent/reversible, available without a session. Proposed: home recommendations, watch-page related recommendations, Shorts shelves/navigation entries. Preserve search, subscriptions, chosen video/player and direct Shorts URLs. Unknown sections stay visible; selectors await live inspection. |

**Storage/privacy proposal:** versioned `chrome.storage.local` holds settings,
recovery and the latest 100 completed sessions, with the cap disclosed. Transient
ownership uses `chrome.storage.session`. Restrict direct storage access to trusted
extension contexts; content requests sanitized state. Chrome local storage survives
browsing-history clearing and is removed on uninstall; session storage clears on
browser restart/extension reload. Do not use `storage.sync`.
[Official storage behavior](https://developer.chrome.com/docs/extensions/reference/api/storage).

Persist local session IDs, timestamps, optional intention, original/final targets,
elapsed duration, optional reflection, settings and recovery metadata only. No
video IDs/titles/URLs, searches, account identifiers, clickstream, remote telemetry
or existing-app data import. History/reflections stay on extension pages; disclose
that in-page intention text can be visible to YouTube page scripts. Local storage
is not an encrypted vault. Propose incognito explicitly disabled initially.

Clear history removes records/reflections while preserving settings/current session.
Delete all cancels the current session, removes records/preferences, restores the
page and returns to idle. Serialize deletion with writes and invalidate queued
samples/reflections so deleted data cannot return. Surface errors; confirm only
after persistence succeeds. Never touch other application or YouTube data.

## 5. Smallest path to a loadable prototype

1. Create independent MV3 package, copied logo, basic popup and top-frame YouTube
   script. Verify loading and that unrelated websites are unaffected.
2. Complete one session slice: explicit optional planning, worker-owned state,
   elapsed indicator, pause/resume/finish, saved recovery. Include meaningful
   clock, ownership and storage tests with this first timer.
3. Add one stored reversible control (watch-page recommendations) and Pause
   Chrysalis cleanup; test navigation and repeated enable/disable. This is the
   smallest useful prototype, not the full release.
4. Subsequent prompts complete checkpoints/breaks, other selected sections,
   optional reflection/history, settings/deletion, accessibility and release QA.

Once implemented: open `chrome://extensions`, enable Developer mode, choose
**Load unpacked → `extension/`**, open/reload desktop YouTube, and use the popup.
No backend/web server should be needed. This is prospective; nothing is loadable yet.
[Official unpacked installation](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world).

## 6. Risks and unknowns requiring later verification

- **YouTube DOM:** signed-in/out layouts, experiments, locale, dynamic navigation,
  lazy loading, Shorts, fullscreen/theater modes and other extensions. Verify live
  selectors, keep failures narrow and preserve core YouTube controls.
- **Timing:** worker suspension, focus/popup behavior, multiple windows/tabs,
  reload/discard, sleep and clock changes. Establish a tested accounting/loss bound;
  do not claim exact timing yet.
- **Cleanup/playback:** remove only owned mutations; dispose observers/listeners/
  timers. Verify invalidated scripts after extension reload/disable; existing tabs
  may need refresh. Test explicit video pause separately from session pause.
- **Data:** delayed/failed writes, corrupt/unknown schemas, quota, concurrent
  finish/delete and stale messages. Do not silently overwrite unknown saved data.
  Prove deletion remains effective after worker/browser restart.
- **Accessibility/assets:** keyboard/focus restoration, screen readers, zoom,
  contrast, toolbar logo legibility, font size and resource exposure. No visual or
  actual browser audit has been performed.
- **Distribution:** verify minimum Chrome version, host-access UX, permissions,
  packaging, Web Store policies/privacy disclosures before release. Local-only
  extension storage makes no claim about YouTube's data practices.
- **Legacy drift:** README ports differ from Vite's 6767; Python instructions
  disagree and virtualenv is absent; `vercel.json` references `/api/cron/drop`
  while `api/index.py` exposes `/api/cron/extract`. These are source discrepancies,
  not diagnosed production failures or extension blockers. Leave untouched.

## 7. Initial-release acceptance criteria

- [ ] Loads as a desktop Chrome MV3 extension with no backend/account setup,
  supported YouTube-only behavior and justified permissions.
- [ ] Optional planning, unplanned sessions, editable intention/target,
  pause/resume/finish work; entertainment and longer sessions receive neutral copy.
- [ ] Compact indicator explains elapsed-time semantics. Automated tests cover
  focus changes, multiple tabs/windows, delayed ticks, pause/break, worker wake,
  restart and recovery without double-counting.
- [ ] Checkpoints occur once per acknowledged target. Continue/Finish/Break and
  dismissal work; breaks end early or expire into paused state, with no penalties.
- [ ] Every supported recommendation/Shorts control persists and reverses across
  supported navigation, preserves core YouTube use, and restores on pause/teardown.
- [ ] Finish saves once; optional reflection and local history distinguish original
  target, final target and elapsed time, without scores or streaks.
- [ ] Clear history and Delete all have distinct accurate effects; tests prove
  stale writes/messages cannot restore deleted data and errors remain visible.
- [ ] Source/network inspection confirms no telemetry, remote executable code,
  sync, credentials, video-history collection or legacy-service calls.
- [ ] Keyboard, screen-reader, light/dark and zoom checks pass for popup/settings/
  injected UI, without focus traps or obscured essential player controls.
- [ ] Automated and actual Chrome-on-YouTube results are recorded separately,
  including browser version, tested routes, limitations and unperformed checks.

## Audit validation

Completed source/configuration/test inspection, tool-version checks, logo hash
comparison, extension searches and official Chrome documentation review. Checked
document paths/whitespace. No application tests/builds, actual browser verification,
database connections/migrations, service startup or deployment ran. Only this plan
and the implementation-status document changed.
