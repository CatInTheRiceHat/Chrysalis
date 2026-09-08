# Store storage decision — 0.9.0 supersedes 0.8.0

**Current decision:** the owner selected password-free viewing with memory-only activity by default and optional encrypted persistent history. Implemented in 0.9.0; see [every field, migration, key handling and policy reasoning](encrypted-history-storage.md). The pending choice below is retained as the historical 0.8.0 record, not a current blocker. Store approval is not guaranteed.

## Historical 0.8.0 assessment

Reviewed 2026-09-07 PDT against the currently served official documentation.
This is a release decision record, not a Store approval or legal opinion.

## Exact question and disposition

The unresolved paragraph in `extension/distribution/STORE_DRAFT.md` asks whether
unencrypted `chrome.storage.local`, restricted to trusted extension contexts,
satisfies the Store's encryption-at-rest requirement for local session/free-text data.

**Do not certify 0.8.0 as meeting that requirement on the available evidence.**
Local-only operation settles whether Chrysalis uploads records; it does not settle
secure storage. The [User Data FAQ, questions 3, 8, 9 and 14](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
requires local handling to be disclosed, requires a privacy policy, and explicitly
includes strong encryption at rest. It states no local-extension-storage exemption.
The [program policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
also require secure handling. Access restriction is not encryption. Neither a
user's possible disk encryption nor an encryption key saved beside ciphertext is
evidence of a portable secure-storage solution for this release.

This resolves the launch gate: preserve 0.8.0 as the verified developer preview;
hold Store certification pending a storage change or explicit applicable clarification
from Chrome Web Store developer support. No clarification has been requested or received.

## Exact product choice

**Recommendation: keep history, add passphrase-protected encrypted storage in a new
version.** Encrypt the persisted session snapshot, including plans, reflections,
timestamps, timing identifiers and command receipts; do not encrypt only the notes.
Use authenticated encryption and a reviewed password derivation/key lifecycle.
Never persist the passphrase or an equivalent plaintext decryption key with the data.
An unlock step after browser restart and no forgotten-passphrase recovery are product
consequences. Keep keys only for the unlocked browser session; define lock behavior,
safe timing pause, and content-script access while locked. Migrate existing plaintext
only after explicit setup, verify the encrypted write before removing the old record,
and preserve unreadable data rather than resetting it. Do not promise erasure of old
disk pages or device backups. Revalidate migration, corruption/wrong-password handling,
deletion, lifecycle and the entire package; revise policy/listing/screenshots and bump
the extension version. These changes are not implemented in 0.8.0.

Alternative: keep personal session state in memory only, removing durable history,
free-text retention, receipts containing plans, and restart recovery. Chrome documents
[`storage.session`](https://developer.chrome.com/docs/extensions/reference/api/storage)
as memory storage cleared on restart/reload/update. This changes the core history
feature and still requires data-handling disclosures. Removing only free-text fields
does not address the retained activity records. Publisher choice is pending; silence
does not select either behavior.

## Code-grounded data inventory

| Information | Read/use | Persistence, deletion and exposure |
| --- | --- | --- |
| YouTube page address, relevant link paths and DOM | `content/youtube-adapter.ts`, `viewing-controls.ts`, `content/index.ts`: recognize supported desktop surfaces and hide only chosen ones | Processed locally; no URL/title/search/transcript or account-identity history is saved. No YouTube API or OAuth. |
| Tab visibility/focus and browser tab/window/document IDs | `background.ts`, `session/model.ts`: foreground timing, lifecycle boundaries and duplicate protection | A timing anchor, timestamps and bounded document markers persist with state; not advertising IDs. No `tabs` permission or general browsing-history API. |
| Preferences, intention ≤80 characters, target and revisions | `shared/types.ts`, `validation.ts`, `storage.ts` | Current session and preferences persist without age expiry. Original/revised targets retained; at most 100 revisions per record. |
| Completed sessions, optional reflection/note ≤500 characters | Same storage layer, `ui/history.ts` | Latest 100 sessions; oldest evicted when finishing another. No age expiry. Delete-one removes its summary and command receipts; clear-history also clears a finished current session but keeps unfinished work and preferences. |
| Command receipts and lifecycle metadata | `session/model.ts`, `background.ts` | At most 64 receipts (signatures may contain a plan), 32 document markers. Browser epoch and visit/checkpoint claims use memory-backed `storage.session`. |
| All local data | `storage.ts: deleteData` | Delete-all writes defaults with monotonic non-personal counters to reject stale writes. It does not erase YouTube history or backups. Uninstall clears extension storage; no export/import/cloud backup exists. |
| Displayed intention | `shared/handler.ts`, `sessionDisplay`, content dialog/dock | Background sends limited display state to its content scripts. The intention entered/displayed in YouTube's DOM can be read by that page. Hiding the indicator does not hide text typed in the introduction; avoid private text in either. Notes/history stay in extension pages. |

The worker restricts local storage to `TRUSTED_CONTEXTS` before reads/writes and
validates message roles. Content scripts cannot request full snapshots or history.
There are no runtime fetch/beacon/socket/analytics/sync clients; extension-page CSP
sets `connect-src 'none'`. There is no project-server upload. The DOM exposure above
must still be disclosed; “no data ever leaves the extension” would be inaccurate.

## Proposed Store disclosures for unchanged 0.8.0

Under the [dashboard instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy),
propose **User activity**, **Website content**, and **Web history** for locally handled
timing/actions, page/form content, and addresses/link paths respectively. Explain that
addresses are inspected transiently and no browsing-address history is retained or
uploaded. Do not choose a blanket no-user-data answer. No financial/payment, health,
authentication, personal-communications, identity or precise-location feature exists;
the extension does not solicit these. Optional free text can nevertheless contain
information a user supplies. Confirm the dashboard's then-current wording before
certifying; these are prepared selections, not selections made in an account.

The implemented use is the declared session/viewing purpose, with no advertising,
sale, credit decisions or remote developer access. The existing privacy text describes
unencrypted local storage honestly; no new encryption claim has been inserted. The
verified ZIP and its packaged policy remain byte-for-byte unchanged.

## Separate website and feedback boundaries

The public site stores a color-theme preference in its own origin's localStorage.
Its own scripts make no analytics/API requests. Vercel receives HTTP requests, which
can include IP address, user-agent, path and time; accessible project log retention
and traffic settings were not available. HTTPS serving is separate from extension
data storage. Do not claim the website receives no data or promise a log-deletion date.

Opening GitHub Issues sends a request to GitHub. Posting voluntarily exposes the
author's GitHub identity and submitted text publicly; account and retention controls
belong to GitHub/project maintainers. The extension neither submits feedback nor
attaches records. Email is also a voluntary separate channel. Support must not request
storage dumps, private notes, credentials or participant tokens in public issues.
