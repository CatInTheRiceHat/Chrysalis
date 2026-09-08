# Chrysalis 0.9.2 — timed sessions and tab handoff

This release removes explicit untimed session choices, exposes direct minute entry, and repairs the selected tab's timer wake-up. Earlier verified 0.9.0 and 0.9.1 packages/tags remain preserved. No Store submission is part of this work.

## Behavior

- The introduction no longer offers “Continue without a timer.” Popup/default preferences no longer offer “No time target,” and checkpoints no longer offer untimed continuation. New start/edit commands reject null targets; the removed continuation command is rejected by both protocol and model validation.
- Minutes can be typed directly, alongside presets, in the introduction, popup and default-session settings. Entering minutes selects Custom automatically. Supported range remains 1–1440 whole minutes. The initial default is 15 minutes; earlier null default preferences remain readable and display a 15-minute starting choice.
- Close/Escape still dismiss the introduction. Manual pause, extension disable, timer hiding, checkpoint dismissal and breaks remain available. Dismissing a checkpoint keeps its chosen target and continues measuring overtime; this is not a forced playback cutoff.
- The worker sends a trusted activation hint to the newly selected tab. This refreshes its existing session and starts sampling even when renderer focus/visibility events are delayed or absent. If a worker reply is already pending, the content script retains the latest visibility signal and sends it immediately afterward instead of discarding it until the next observation interval.

## Tab-switch finding

The earlier sampler returned immediately whenever a request was pending, discarding focus/visibility changes. In the automated Chromium regression, selecting another tab and returning emitted no renderer focus/visibility events. Holding a sampling reply across that handoff left the returned tab waiting for another two-second observation interval. The new worker hint and queued latest signal cover both cases. The regression requires another observation within one second of releasing the held reply; the prior behavior failed that assertion.

Twelve rapid real browser tab activations retain one session and monotonic elapsed time. More than six seconds in a non-YouTube tab is excluded without turning normal return into an explicit recovery pause. True missing-signal recovery and manual pause still require Resume, preserving the conservative timing contract.

## Verification and artifacts

The unit suite has 82 tests. `npm run test:package` verifies reproducibility and runs all twelve browser suites on ZIP-extracted bytes. Its startup suite now tests direct typed 17-minute entry, the delayed-reply tab race, rapid switching and time away; the popup suite tests typed 23-minute entry and saving a typed 19-minute default. Existing suites cover accessibility, extensions reload, checkpoints, encrypted history and preserved data. Live startup/tab-switch checks are run separately against signed-out YouTube.

Artifacts are `extension/release/chrysalis-0.9.2.zip`, its checksum, unpacked folder, build manifest, validation, screenshots and Store-preparation kit. CI records are stored with the generated release evidence. Source/versioned artifacts bind to their ZIP checksum; completion is reported only after the corresponding checks pass.

ZIP SHA-256: `6f5a741e846fcb364b9ce1e6e06d5e7b1ce6a1ca8ea5420cf4b4b6ba6b251326`.

## Preserved behavior and limits

No permissions, storage schema or network capabilities were added. Earlier untimed history and target revisions remain readable; they are not rewritten as timed sessions. Browser restart/update/reload still clears unfinished activity under the existing privacy design. Refresh existing YouTube tabs after updating the unpacked installation. Startup latency and Chrome scheduling vary. Tests do not cover every browser/OS, authenticated YouTube experiment, physical screen reader or OS sleep/wake condition. The user has not yet specified whether the originally observed tab-switch glitch was a visual jump, duplicate widget or unexpected pause; the concrete handoff race above is reproduced and addressed.
