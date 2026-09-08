# Chrome Web Store submission draft — NOT SUBMITTED

Prepared 2026-09-08 for 0.9.0. No publisher account was accessed, no ZIP uploaded,
and no item published. The owner’s storage decision is implemented: password-free viewing, temporary activity by default, optional encrypted history. See `../../docs/encrypted-history-storage.md`. The matching 0.9.0 policy is now publicly accessible; publisher certification remains required; no approval is guaranteed.

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
Missing signals may require you to resume; browser restart clears unfinished sessions and temporary history.

At your chosen target, a dismissible centered check-in offers additional time, no target,
Finish or a voluntary break. Dismiss it or disable prompts if you prefer. A break
uses a wall-clock countdown and never blocks YouTube or automatically resumes viewing.

After finishing, optionally reflect or skip. Local history shows the plan, revisions,
foreground duration, separate break duration and optional reflection, without a
score. Keep up to 100 sessions and delete one, clear history or reset everything.

Your timer, introduction and viewing controls never need a password. By default,
plans, reflections and session history stay in browser memory and disappear when
Chrome restarts or Chrysalis is reloaded, updated or disabled. Non-personal preferences
remain on this device. Optional persistent history encrypts completed records with
a password; unlock only that feature. New activity while locked stays temporary.
No password recovery, cloud backup or automatic transfer from an unpacked installation
to a future Store item is included. Earlier plaintext history requires your explicit
choice to encrypt or confirm deletion. An unfinished earlier plan is archived, not resumed.

No analytics, remote logging, accounts or cloud sync. Chrysalis inspects page addresses
and structure without saving video titles, URLs, searches, transcripts or account
identities. Your intention can be read by YouTube when entered or displayed in its page.
Reflections and passwords stay in trusted extension pages. Requires desktop Chrome 114+.

This is an early preview. Unfamiliar YouTube layouts stay usable and some items may
remain visible. Populated/signed-in and experimental layouts need broader testing.
Pause Chrysalis restores ordinary layout; enable it and resume your session separately.
Entertainment, exploration and longer sessions are valid choices.

## Developer Dashboard draft fields

| Field | Prepared answer / unresolved input |
| --- | --- |
| Single purpose | Help people make their desktop YouTube sessions match their own intentions through optional planning, reversible viewing controls, foreground-time awareness and deliberate session choices. |
| `storage` justification | Save non-personal preferences in local storage; current sessions, temporary history, timing/visit/duplicate metadata and unlocked keys in trusted memory-backed session storage. Save optional password-encrypted history in local storage. No sync or remote storage. |
| Website access justification | Static top-frame `https://www.youtube.com/*` content script recognizes page structure, applies user-chosen visibility rules, displays the indicator and sends visibility/timing observations. No broad host access. |
| Remote code | No. All JavaScript, fonts and images are packaged. MV3 extension-page CSP forbids remote code/network connections. |
| Data disclosures | Disclose local handling; do not select a blanket “no user data” statement merely because there is no upload. Propose selecting **User activity** (foreground timing/actions), **Website content** (page structure and user-entered text), **Web history** (addresses/link paths examined locally for page/surface detection; no URL history retained), and **Authentication information** (password and derived key used locally for optional encrypted history; no account login, password retention or upload). Never claim browsing addresses are stored. No identifiers, financial, health, account-login or private-communications feature is requested. Free text can contain information users choose to enter. Publisher must confirm the exact dashboard selections before submitting. |
| Data-use certifications | Intended use is the single purpose above. No sale, unrelated transfer, advertising/credit use or remote human access to stored records. The displayed intention is visible within YouTube as disclosed. Final certifications require the publisher's review of the current policy and implemented encryption/migration behavior. |
| Language | English. |
| Category | Select the closest currently available category in the dashboard after reviewing its choices; no category was submitted or invented as an established classification. |
| Privacy URL | https://chrysalis-extension-pages.vercel.app/privacy — verified anonymously over HTTPS on 2026-09-08; exact reviewed 0.9.0 HTML. Hosted separately from the application; no sign-in required. |
| Publisher/support | Support: https://chrysalis-extension-pages.vercel.app/contact and https://github.com/CatInTheRiceHat/Chrysalis/issues. Public GitHub Issues verified reachable; repository contact: elaineyouyuanche@gmail.com. Publisher registration, identity verification and dashboard declarations still require the owner. |
| Visibility | No selection made. Consider private trusted testers only after review blockers are resolved; an unlisted link is accessible to anyone who has it. |

No store credentials, API key or update URL is embedded in the package. A later
store-assigned ID and migration plan are separate work; do not upload just to obtain
an ID during this preparation stage.

## Assets and reviewer instructions

- ZIP with manifest at root: `../release/chrysalis-0.9.0.zip`.
- Required 128px icon: `../static/icons/icon-128.png`; toolbar variants 16/32/48 also
  included. These export the existing Chrysalis butterfly, not a Google/YouTube icon.
- Draft small promotional tile: `artwork/promo-440x280.png` (440×280).
- Current capture command: `npm run screenshots`, after package validation. Versioned
  output: `../release/chrysalis-0.9.0-screenshots/`, including the centered introduction,
  viewing settings, target check-in, encrypted history and locked history. Live timer and temporary history remain supplementary captures. Captures use
  actual signed-out YouTube and real elapsed time; no participant records or statistics.
  The report binds screenshots to the ZIP/source revision. Inspect final sizes/artwork
  before submission; supplemental 375px popup images are not Store-sized candidates.
- Historical `distribution/screenshots/` stays preserved as 0.7.1 evidence and is not
  an accurate depiction of 0.9.0. Do not submit old screenshots as this release.

Reviewer flow: normal viewing needs no login or password. To test optional persistence, choose a new 12–128-character test password in Session history, enable encryption, Finish a session, lock/unlock history and restart Chrome. The timer continues while locked; restarting clears unfinished activity. No predefined credentials are needed. Open the popup, skip/read setup,
start a custom one-minute target and keep a supported YouTube tab active. Use settings
to turn controls on/off. At the target, continue untimed or add time; take/end a custom
one-minute break, finish and Skip/answer reflection. Open history, delete a session,
then use separate Delete all data. Use the popup as an alternative to the in-page timer.
Foreground measurement needs an active tab and focused window, not merely playback.
Unfamiliar/empty layouts intentionally stay visible. See the full [pilot guide](../pilot/GUIDE.md).

## Current official requirements reviewed

Accessed 2026-09-08. The following is a preparation check, not a certification or an
assertion that Google's review will approve the extension.

| Requirement | Current preparation / remaining action | Official source |
| --- | --- | --- |
| Production testing, correct manifest/version, description ≤132 characters, ZIP with manifest at root | Build/reference checks, locked dependencies, byte comparisons and extracted-package browser tests prepared. | [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare) |
| 128px icon, small 440×280 promotion image, at least one real 1280×800 or 640×400 screenshot | Required sizes exported/captured locally; final publisher artwork review remains. | [Supplying images](https://developer.chrome.com/docs/webstore/images) |
| Narrow purpose, least permissions, remote-code declaration, accurate privacy fields | Drafts above match the actual package; publisher must complete/certify the dashboard. | [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) |
| Local-only data handling still needs disclosure and privacy policy | Full local policy and public policy URL verified; optional history is encrypted and temporary activity stays in memory; the matching 0.9.0 policy is public; final publisher certification remains. GitHub Issues is verified and the repository email is documented. | [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) |
| Limited Use, secure handling, truthful metadata, no impersonation, developer two-step verification | Independent branding and limited-use explanation prepared. Account security and final policy review unverified. | [Program Policies](https://developer.chrome.com/docs/webstore/program-policies/policies) |
| Registration and publisher setup before publishing | No account/payment action taken; owner supplies verified publisher details. | [Register](https://developer.chrome.com/docs/webstore/register), [Publishing](https://developer.chrome.com/docs/webstore/publish) |
| Private/unlisted/public items face the same policy review | A private pilot does not bypass review. Do not confuse local unpacked testing with store distribution. | [Distribution settings](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution) |

**Storage decision implemented:** see [the field inventory, migration and key lifecycle](../../docs/encrypted-history-storage.md). Existing 0.8.0 plaintext is preserved only pending an explicit encrypt/delete choice; new activity never extends that record. Browser restart removes the memory key and unfinished activity. The preserved 0.8.0 release is not replaced or retrospectively claimed encrypted.

**Prepared materials:** `release/chrysalis-0.9.0-store-preparation/` is assembled by `node scripts/prepare-store.mjs` after package validation and current screenshots. It includes the exact upload ZIP/checksum, five release screenshots, icon, small promo, listing, disclosures and identity guidance. Review the inventory and validation for actual evidence. Public privacy/support destinations are verified. Publisher account setup and final certifications must be completed before submission. See PUBLISHER_CHECKLIST.md. No Store URL or publisher identity is invented.
