# Chrome Web Store submission draft — NOT SUBMITTED

Prepared 2026-09-07 for 0.8.0. No publisher account was accessed, no ZIP uploaded,
and no item published. See `../../docs/launch-storage-policy.md` for the concrete storage decision gate. Do not certify or submit unchanged 0.8.0 on the present encryption evidence.

## Proposed listing copy

**Name:** Chrysalis

**Short description (matches packaged manifest):**
Plan YouTube sessions, notice foreground time and choose which supported recommendation surfaces to hide.

**Detailed description:**

Make desktop YouTube fit what you came for, with choices you can change.

A centered introduction appears once per visit (after 30 minutes away), with an
optional intention and chosen duration. Refreshes and extra tabs share the visit.
Continue without a timer starts no session. Disable automatic introductions in settings.
Chrysalis is an independent browser extension, not affiliated with or endorsed by
YouTube or Google. It works on www.youtube.com in desktop Chrome, not the native
YouTube phone app.

Start with studying, a specific video, entertainment, exploring or your own short
intention. Choose a time target or leave it open. Edit your intention or target
while viewing. The original target and explicit revisions remain available in your
local session summary.

Choose which recognized surfaces to hide: Home recommendations, related videos on
watch pages, and supported Shorts shelves/navigation. Controls start off and can be
reversed. Hiding Shorts entry points does not block all Shorts URLs. Chrysalis does
not change the recommendation algorithm, block ads or manipulate playback.

A compact side timer shows foreground YouTube time: browsing and playback while
YouTube is the active tab of your focused window. This is not exact watch time or
a measure of attention. Hidden/unfocused tabs, pauses and breaks do not count.
Missing signals may require you to resume; browser restart restores viewing paused.

At your chosen target, a dismissible centered check-in offers additional time, no target,
Finish or a voluntary break. Dismiss it or disable prompts if you prefer. A break
uses a wall-clock countdown and never blocks YouTube or automatically resumes viewing.

After finishing, optionally reflect or skip. Local history shows the plan, revisions,
foreground duration, separate break duration and optional reflection, without a
score. Keep up to 100 sessions and delete one, clear history or reset everything.

Plans, reflections and preferences stay in Chrome's local storage. No analytics,
remote logging, accounts or cloud sync. Chrysalis accesses page structure for controls
without saving video titles, URLs, searches, transcripts or account identities.
Your current intention is visible to YouTube when shown in the page. Personal notes
stay in extension pages; local data is not encrypted by Chrysalis.

This is an early preview. Unfamiliar YouTube layouts stay usable and some items may
remain visible. Populated/signed-in and experimental layouts need broader testing.
Pause Chrysalis restores ordinary layout; enable it and resume your session separately.
Entertainment, exploration and longer sessions are valid choices.

## Developer Dashboard draft fields

| Field | Prepared answer / unresolved input |
| --- | --- |
| Single purpose | Help people make their desktop YouTube sessions match their own intentions through optional planning, reversible viewing controls, foreground-time awareness and deliberate session choices. |
| `storage` justification | Persist local preferences, current session, bounded history and duplicate/revision metadata. Temporary browser-epoch storage distinguishes a worker wake-up from a full restart. No sync or remote storage. |
| Website access justification | Static top-frame `https://www.youtube.com/*` content script recognizes page structure, applies user-chosen visibility rules, displays the indicator and sends visibility/timing observations. No broad host access. |
| Remote code | No. All JavaScript, fonts and images are packaged. MV3 extension-page CSP forbids remote code/network connections. |
| Data disclosures | Disclose local handling; do not select a blanket “no user data” statement merely because there is no upload. Propose selecting **User activity** (foreground timing/actions), **Website content** (page structure and user-entered text), and **Web history** (addresses/link paths examined locally for page/surface detection; no URL history retained). Never claim browsing addresses are stored. Do not request identifiers, financial, health, authentication or communications data. Free text can contain information users choose to enter. Publisher must confirm the exact dashboard selections before submitting. |
| Data-use certifications | Intended use is the single purpose above. No sale, unrelated transfer, advertising/credit use or remote human access to stored records. The displayed intention is visible within YouTube as disclosed. Final certifications require the publisher's review of the current policy and unresolved secure-storage question below. |
| Language | English. |
| Category | Select the closest currently available category in the dashboard after reviewing its choices; no category was submitted or invented as an established classification. |
| Privacy URL | https://thechrysalisproject.vercel.app/privacy — verified publicly reachable during launch preparation. Reconfirm if the old application is restored; see deployment/launch-cutover.md. |
| Publisher/support | Support: https://thechrysalisproject.vercel.app/contact and https://github.com/CatInTheRiceHat/Chrysalis/issues. Public GitHub Issues verified reachable; repository contact: elaineyouyuanche@gmail.com. Publisher registration, identity verification and dashboard declarations still require the owner. |
| Visibility | No selection made. Consider private trusted testers only after review blockers are resolved; an unlisted link is accessible to anyone who has it. |

No store credentials, API key or update URL is embedded in the package. A later
store-assigned ID and migration plan are separate work; do not upload just to obtain
an ID during this preparation stage.

## Assets and reviewer instructions

- ZIP with manifest at root: `../release/chrysalis-0.8.0.zip`.
- Required 128px icon: `../static/icons/icon-128.png`; toolbar variants 16/32/48 also
  included. These export the existing Chrysalis butterfly, not a Google/YouTube icon.
- Draft small promotional tile: `artwork/promo-440x280.png` (440×280).
- Current capture command: `npm run screenshots`, after package validation. Versioned
  output: `../release/chrysalis-0.8.0-screenshots/`, including the centered introduction,
  viewing settings, live side timer, target check-in and local history. Captures use
  actual signed-out YouTube and real elapsed time; no participant records or statistics.
  The report binds screenshots to the ZIP/source revision. Inspect final sizes/artwork
  before submission; supplemental 375px popup images are not Store-sized candidates.
- Historical `distribution/screenshots/` stays preserved as 0.7.1 evidence and is not
  an accurate depiction of 0.8.0. Do not submit old screenshots as this release.

Reviewer flow: no login or credentials required. Open the popup, skip/read setup,
start a custom one-minute target and keep a supported YouTube tab active. Use settings
to turn controls on/off. At the target, continue untimed or add time; take/end a custom
one-minute break, finish and Skip/answer reflection. Open history, delete a session,
then use separate Delete all data. Use the popup as an alternative to the in-page timer.
Foreground measurement needs an active tab and focused window, not merely playback.
Unfamiliar/empty layouts intentionally stay visible. See the full [pilot guide](../pilot/GUIDE.md).

## Current official requirements reviewed

Accessed 2026-09-07. The following is a preparation check, not a certification or an
assertion that Google's review will approve the extension.

| Requirement | Current preparation / remaining action | Official source |
| --- | --- | --- |
| Production testing, correct manifest/version, description ≤132 characters, ZIP with manifest at root | Build/reference checks, locked dependencies, byte comparisons and extracted-package browser tests prepared. | [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare) |
| 128px icon, small 440×280 promotion image, at least one real 1280×800 or 640×400 screenshot | Required sizes exported/captured locally; final publisher artwork review remains. | [Supplying images](https://developer.chrome.com/docs/webstore/images) |
| Narrow purpose, least permissions, remote-code declaration, accurate privacy fields | Drafts above match the actual package; publisher must complete/certify the dashboard. | [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) |
| Local-only data handling still needs disclosure and privacy policy | Full local policy and public policy URL verified; storage certification remains blocked as explained below. GitHub Issues is verified and the repository email is documented. | [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) |
| Limited Use, secure handling, truthful metadata, no impersonation, developer two-step verification | Independent branding and limited-use explanation prepared. Account security and final policy review unverified. | [Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies) |
| Registration and publisher setup before publishing | No account/payment action taken; owner supplies verified publisher details. | [Register](https://developer.chrome.com/docs/webstore/register), [Publishing](https://developer.chrome.com/docs/webstore/publish) |
| Private/unlisted/public items face the same policy review | A private pilot does not bypass review. Do not confuse local unpacked testing with store distribution. | [Distribution settings](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution) |

**Storage release gate resolved; product choice pending:** the official FAQ explicitly
requires encryption at rest and gives no local-storage exemption. Access restriction
alone does not establish that 0.8.0 meets it. Hold Store certification; recommend a
new version with passphrase-protected encrypted history and an unlock step. The
alternative removes persistent session history and restart recovery. See the exact
choice, inspected data flows and implementation acceptance criteria in
[the storage decision](../../docs/launch-storage-policy.md). No encryption change,
new runtime version, support message or Store submission was made in this task.

**Prepared materials:** `release/chrysalis-0.8.0-store-preparation/` contains the
unchanged verified ZIP/checksum, five actual release screenshots, icon, small promo,
listing copy, justifications, identity guidance and inventory. Run
`node scripts/prepare-store.mjs` from `extension/` to reconstruct it without rebuilding
or overwriting the verified release. The materials are ready for publisher review;
the storage gate prevents an unconditional submission-ready claim.
