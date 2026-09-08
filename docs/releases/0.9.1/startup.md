# Chrysalis 0.9.1 automatic startup

The verified 0.9.0 artifact is preserved. This release removes two startup delays: `document_idle` injection and a worker foreground check that rejected tabs with `status: loading`, followed by a 15-second prompt retry. Popup focus could trigger another refresh, making the icon seem necessary despite the worker already having synchronous message listeners.

The manifest now injects at `document_start`. The content script asks the worker for session state immediately, before a body exists. A short-lived document observer mounts UI when the body appears; no YouTube player, recommendations, application shell, DOMContentLoaded or window load gate is involved. Requests wake the extension worker. Transient read/messaging failures retry with bounded backoff. Native focus, visibility, pageshow, pagehide, YouTube navigation and history traversal refresh existing state; listeners, timers and observers dispose before reinjection.

The introduction retains native dialog semantics, centered top-layer rendering, explicit labels, focus containment, Escape and focus restoration. Media already present, inserted later or attempting autoplay is paused while the introduction is open. Start/dismissal removes the media guard; playback is not forced to resume. Checkpoints leave playback alone. No session is created or charged until the user presses Start. Timer hiding remains independent of tracking; explicit extension pause and the auto-introduction preference are honored.

No permissions, storage schema, persistence/key lifecycle, data collection or network capabilities were added. Sessions survive worker suspension, refresh, tab handoffs and internal navigation. A full browser restart intentionally clears unfinished sessions and temporary history, as in 0.9.0. Restored tabs therefore open a new-browser introduction without a popup.

## Verification method

`npm run test:package` checks reproducibility and executes twelve suites against the exact ZIP-extracted files. `tests/startup-browser.mjs` creates a disposable browser profile and never opens popup.html or options.html, never clicks the toolbar, and does not send initialization commands before the first introduction. It tests cold Home entry, a stopped worker followed by a direct video link, Shorts, refresh, multiple tabs, time handoff, hidden timer, disabled settings and native `--restore-last-session`. The controlled page delays the parser by 600ms and an image by 6000ms; its intro must precede full loading. Existing browser suites cover repeated injection, observer disposal, keyboard interaction, encrypted storage and fault-injected startup retries. Live mode additionally exercises actual YouTube internal navigation and playback pause.

Measurements use page `performance.now()` at the first animation-frame callback where the native dialog is open, relative to navigation time origin. They are observations with browser/network scheduling overhead, not a latency guarantee. Native restoration may start before automation attaches; its reported observation is an upper bound, not a first-frame measurement. Raw reports are saved under `extension/test-results/startup-{fixture,live}-report.json` and bound to the ZIP SHA-256.

## Release evidence

The final runtime ZIP SHA-256 is `a0e274468da4dc46ee33d67accdc8f9cf660a85277cfbdf3f79867651da34765`. Measurements below are single observations per scenario in disposable profiles, Chromium 153.0.8010.12 on macOS. Every measured introduction preceded the page load event (`loadEventEnd: 0`). The fixture results include the artificial 600ms parser delay.

| Run | Entry | Navigation to introduction | Document state |
| --- | --- | --- | --- |
| live | cold fresh profile / Home | 675.7 ms | loading |
| live | suspended worker / direct watch | 955.4 ms | loading |
| live | new visit / direct Shorts | 1163.9 ms | loading |
| fixture | cold fresh profile / Home | 743.1 ms | loading |
| fixture | suspended worker / direct watch | 630.4 ms | interactive |
| fixture | new visit / direct Shorts | 650.2 ms | interactive |

The adjacent [live report](startup-live-report.json) and [controlled report](startup-fixture-report.json) include the observed browser-launch duration and native-restore observation bounds. Both runs passed without opening any popup or options page. Native restoration, explicit worker stop, multiple tabs, active session recovery, hidden timer, opt-out settings, keyboard Start/Escape and autoplay pause were exercised. Live internal YouTube navigation kept the same document and session. Full packaged validation covers 81 unit tests and twelve browser suites, including injected startup failure recovery.

Hosted CI is run on the separate `launch/extension-0.9.1-startup` branch using the existing [extension workflow](https://github.com/CatInTheRiceHat/Chrysalis/actions/workflows/extension-ci.yml). The final hosted-run URL and checksum comparison are recorded with the generated release evidence and in the delivery summary; do not treat the old 0.9.0 run as validation for these bytes. The packaged release is not submitted to the Chrome Web Store. The synchronized public-site source has not been deployed by this task.

## Limits

Desktop `https://www.youtube.com` top-frame documents only, with Chrome site access enabled. Pages already open when the extension is installed/updated need refreshing. Background/restored lazy tabs initialize when Chrome activates/loads their document; a hidden/unfocused tab does not steal focus with an introduction. Existing unfinished sessions and already-dismissed visits suppress another introduction. Hardware, network, storage and browser scheduling vary; neither zero startup latency nor complete prevention of an initial media frame before the script mounts is promised. Live tests use signed-out YouTube and Chromium on macOS; physical screen readers, OS sleep/wake, old Chrome versions and every signed-in/experimental layout are not verified.

Chrome references: [content-script timing](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle). Runtime messaging wakes a dormant worker; document-start injection must handle an incomplete DOM.
