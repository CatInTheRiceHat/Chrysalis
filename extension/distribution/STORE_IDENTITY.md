# Installation identity and Store transition

0.8.0 has no manifest `key`, Store-assigned ID or update URL. Nothing was uploaded
to create an item. Its ZIP is for Load unpacked and is not a signed Store installer.

| Installation change | Settings/history outcome |
| --- | --- |
| Replace files at the same unpacked folder, Reload the existing card | Same installation identity is expected; schema 7 migrates valid prior schemas. Do not uninstall. |
| Move folder, load a second copy, use a different Chrome profile | A different identity/storage area may result. Do not assume the old records are visible. |
| Install the future Store item | Treat as a separate installation with empty local settings/history. No cross-ID transfer is implemented. |
| Uninstall the old unpacked copy | Chrome clears its extension-local data. Do not do this before deciding whether its history must be retained. |
| Later Store updates of the same item | Same Store identity; versioned schema migration must be tested for each update. |

Chrome's [manifest key guidance](https://developer.chrome.com/docs/extensions/reference/manifest/key)
explains using an item's public key to maintain a stable development ID after an item
exists. Adding that key later does not transfer another ID's existing storage. Do not
invent a key, privately sign over the preserved release, or promise seamless migration.
[Chrome storage documentation](https://developer.chrome.com/docs/extensions/reference/api/storage)
states that local extension data is cleared on removal.

Recommended initial guidance: finish the old session, retain its installed folder/card
and disable it before enabling the Store item to avoid duplicate YouTube controls.
The Store copy starts fresh. There is no export/import feature; website and Flutter
records also are not imported. If carrying history into the Store is a requirement,
implement and validate an explicit user-controlled migration in a new version before
promoting that transition. Do not ask users to share Chrome profiles or storage dumps.

Publisher setup still requires the owner's account, registration/payment where
applicable, two-step verification, verified contact/publisher details, distribution
choice and final certifications. No publisher identity, Store URL, item ID or account
status has been invented. See the official [registration](https://developer.chrome.com/docs/webstore/register),
[preparation](https://developer.chrome.com/docs/webstore/prepare) and
[publishing](https://developer.chrome.com/docs/webstore/publish) instructions.

Manual preflight not established by the existing automated evidence: older minimum
Chrome 111, signed-in/populated and experimental YouTube layouts, physical sleep/wake,
human screen-reader use and physical toolbar positioning. Scope remains desktop
YouTube only; no mobile-app, productivity-outcome or universal-layout claim.
