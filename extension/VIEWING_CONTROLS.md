# Reversible YouTube viewing controls

Implemented in extension 0.3.0. All three settings default **off** and persist
locally. Expand **Your viewing layout** in the popup, or use settings. Turn any
control off to restore its surface; **Restore ordinary layout** disables all three
across open YouTube tabs without changing the session, indicator or appearance.

## Scope and support evidence

These are visibility controls, not URL blocking or changes to YouTube's algorithm.
They do not explain recommendations, manipulate autoplay, control the player,
remove ads or alter accounts. Direct Shorts URLs remain usable.

| Control | Exact scope | Verification on 2026-09-07 |
| --- | --- | --- |
| Homepage recommendations | Recognized video cards and identified Shorts shelves inside the active `ytd-browse[page-subtype="home"]` rich grid, on `/` only. Ads, prompts, playlists and unfamiliar items remain. | Actual home root/empty-feed prompt inspected. **Populated card/shelf hiding is fixture-verified only**: the signed-out live homepage supplied no recommendations. |
| Related-video recommendations | Recognized watch-link video cards and Shorts shelves in `ytd-watch-next-secondary-results-renderer` inside the active watch page's `#related`. Includes below-player positioning at narrower widths. | **Live hide/restore verified** for current `yt-lockup-view-model` cards within an item section and `ytd-reel-shelf-renderer` shelves. Older compact-card and direct-item variants are fixture-verified only. Narrow live layouts not exhaustively checked. |
| Supported Shorts entry points | Identified Shorts shelves on Home/watch pages, plus specific Shorts entries in the expanded sidebar/mini guide. Search/subscription shelves, channel tabs, arbitrary Shorts links and direct URLs remain. | **Live watch shelf and expanded English sidebar hide/restore verified.** Mini guide and populated Home shelves are fixture-verified only. |

Live checks used a real unpacked extension in Chromium 153.0.8010.12 with a
fresh, signed-out temporary profile, on public Home, a watch page, search and
subscriptions. Search and subscriptions used native YouTube navigation without a
reload, confirmed by retaining the same document. A later successful run confirmed
video time advancing while related recommendations were hidden. An earlier run
stalled at time zero; the live test now establishes baseline playback with controls
off before checking progress with them on and reports unavailable playback separately.

The current sidebar's Shorts anchor had `id="endpoint"`, `title="Shorts"`, and
**no href**. That exact known entry is supported, as are scoped relative Shorts
links. We do not infer entries from text substrings, arbitrary ancestors, SVG paths,
private page JavaScript or recommendation data.

## Implementation and reversal

- `src/content/youtube-adapter.ts` owns route detection, all YouTube selectors,
  CSS rule construction, mutation filtering and support diagnostics.
- `src/content/viewing-controls.ts` owns one stylesheet, one removable status
  disclosure and one observer, created only while a control is enabled.
- Rules hide only positive known card/shelf/entry shapes using `display: none`.
  They never hide the entire grid, `#related`, `#secondary`, a generic link ancestor
  or a whole navigation container. This intentionally leaves gaps or other content
  where needed to preserve ads, prompts and unfamiliar layouts.
- Known ad renderers, video/iframe/player descendants and playlist links/panels
  exclude a candidate from hiding. A candidate gaining such content is immediately
  revealed by CSS. No YouTube nodes are removed, rewritten or given inline styles;
  native event handlers, references and previous styles survive restoration.
- Browser CSS matching handles late insertion, reparenting and relevant attribute
  changes. JavaScript never scans all video cards or continuously walks the page.
  One child-list/limited-attribute observer filters relevant structural changes;
  diagnostic probes coalesce at 500ms. At most 80 records/nodes per batch are
  inspected before scheduling one probe; probes use first-match queries, not full
  result enumeration. Player progress, text and ordinary style/class changes are
  not observed. The observer runs only with enabled viewing controls.
- Route scoping combines the URL and active renderer's subtype/hidden state.
  `yt-navigate-start` clears recommendation rules during handoff;
  `yt-navigate-finish` and `popstate` reconcile the new page. Those YouTube events
  are site conventions, not a public stability guarantee.
- Reinitialization disposes the previous controller. All-off, disposal and pagehide
  remove the control style/status/owned HTML attribute, disconnect the observer,
  cancel the scheduled probe and remove its event listeners. Back/forward-cache
  pageshow reapplies current saved preferences. No duplicate observers/mounts.
- Expand **Chrysalis · viewing controls** on YouTube to inspect per-control status.
  No match reports “No supported items found. Empty or unfamiliar layouts stay
  visible.” A match reports only recognized items hidden, with other content
  potentially remaining. It does not claim complete coverage. This status remains
  available while controls are enabled even if the separate session indicator is off.

Schema **3** adds three boolean preferences. Valid extension schemas 1/2 upgrade
without losing settings, sessions, summaries, timing or receipts; unknown/malformed
records remain untouched. Existing serialized/revision-checked settings messages
and sender restrictions are reused. No new permissions, telemetry, browsing records,
backend, player API or page-to-extension privileged messaging was added.

## Known unsupported or unverified layouts

- Populated signed-in Home and authenticated subscription content were unavailable
  in the signed-out profile. Fixture success is not live selector verification.
- Legacy rich-grid row wrappers, unknown experiment containers, generic shelves,
  channel Shorts tabs, search filters/shelves, playlists/mixes and alternate domains
  are intentionally outside the initial selector set. Unrecognized structures stay
  usable. If only part of a section is recognized, only that part is hidden.
- Mini-guide and legacy compact-card selectors need live confirmation. Href-less
  localized Shorts labels other than exactly `Shorts` are unsupported.
- Playlist queues, live chat, ads within candidate cards and captions/playback
  preservation have controlled fixture coverage. Live player, caption/play controls
  and ordinary playback were checked; real ad delivery, signed-in account flows,
  captions rendering, playlist playback, fullscreen/theater/miniplayer variants and
  every YouTube experiment were not exhaustively exercised.
- Extension reload/disable can invalidate old scripts without a final callback.
  Refresh existing YouTube tabs for guaranteed cleanup; Restore ordinary layout
  before disabling also removes enabled controls from connected tabs.

## Checks and manual verification

From `extension/`:

```sh
npm ci
npm run check                 # 35 Node tests, types, build, generated-file checks
npx playwright install chromium
npm run test:browser          # foundation, session and viewing fixture suites
npm run test:viewing          # viewing fixtures only, real unpacked extension
npm run test:viewing:live     # separate actual signed-out YouTube checks
```

Browser reports/screenshots go to ignored `test-results/`. The fixture suite checks
independence, popup reopening, two-tab synchronization, late rendering, reversal of
the same nodes, navigation, ad-bearing/unknown candidates, playing fixture media,
search/subscriptions/playlists/direct Shorts, unfamiliar status, duplicate observer
prevention, pagehide/pageshow and complete cleanup after restoration.

Load/reload `extension/dist/` at `chrome://extensions`, then refresh YouTube. In
installed Chrome, toggle each control separately on a populated homepage and a watch
page; navigate Home → watch → search → subscriptions without refreshing; verify the
player, ads, captions and playlist queue still work. Toggle off and use Restore
ordinary layout. Inspect the in-page status on layouts with no supported matches.
These manual checks, especially authenticated layouts and the native toolbar popup,
remain necessary beyond the recorded automated browser coverage.
