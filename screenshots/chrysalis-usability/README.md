# Usability-review evidence

See [the complete review](../../docs/chrysalis-usability-review.md) for revision,
reproductions, evidence limits, test matrix and results. No participant data/findings.

- `before-*`: pre-fix screenshots. `before-native-sizing` is from intermediate copy
  edits before the separate native sizing fix; `before-live-narrow-zoom` precedes the
  separate placement fix. They are not claimed as untouched-baseline native captures.
- `after-native-*`: actual Chrome action-popup DevTools target opened with
  `chrome.action.openPopup`, not an ordinary tab. Headless Chromium, no desktop chrome.
- `after-live-*`: actual signed-out YouTube and unpacked extension. Public site content
  can vary. Some frames show YouTube's own playback error; not a claim that playback
  verification passed there. `after-live-layout-report` is the final placement retest.
- Remaining screen captures: actual extension pages in tabs or controlled YouTube-origin
  fixture documents with the real extension. Artificial intentions/video labels are
  engineering test inputs, not real user histories.
- `initial-live-modes-report.json` records initial failed assertions. Later reports
  explain corrected fullscreen automation and a blocked media baseline. Width-only
  zoom checks were strengthened after visual inspection caught left-edge clipping.
- Before images were manually reviewed before editing; final setup, native action,
  active/dark, editor, collapsed phase, break, checkpoint and zoom images were inspected.
