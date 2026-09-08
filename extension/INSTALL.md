# Build, install and troubleshoot Chrysalis 0.9.1

## Personal installation / volunteer files

The prepared ZIP is **not** a signed CRX or an automatic installer. It contains only
the extension's build assets, with `manifest.json` at its root. Do not drag the ZIP
onto Chrome or select the repository/source folder.

1. Read the [privacy explanation](PRIVACY.md) and [pilot guide](pilot/GUIDE.md) first.
   Participation and every control are optional. You can stop and delete data.
2. Extract `chrysalis-0.9.1.zip` using your normal archive tool. Place the extracted
   files in a stable folder you control, for example `Documents/Chrysalis-extension`.
   Opening that folder must show `manifest.json`, `popup.html`, `background.js`, etc.
3. Open `chrome://extensions` in desktop Chrome and turn **Developer mode** on.
   Choose **Load unpacked** and select that folder. If your organization prevents
   developer extensions, ask its administrator or use an eligible personal profile;
   do not bypass managed-device policy.
4. Open or refresh `https://www.youtube.com/`. A centered introduction offers a plan; the compact timer sits
   near the right edge and can be hidden/restored. No toolbar click or popup setup is required. Pinning is optional; the popup provides additional session controls. Playback pauses while the introduction is open; press play afterward when ready.

These are the official [local loading steps](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked).
No extension account, Google login, OAuth consent or YouTube API key is required.
Requires desktop Chrome 114 or later. The website access is only the desktop YouTube origin. `storage` saves non-personal preferences locally and keeps session activity in browser memory. Optional persistent history is encrypted; only this feature needs a password.

Exact paths in this workspace:

- Development production build: `/Users/elaine/Documents/Chrysalis/extension/dist`
- Extracted distribution: `/Users/elaine/Documents/Chrysalis/extension/release/chrysalis-0.9.1-unpacked`
- ZIP: `/Users/elaine/Documents/Chrysalis/extension/release/chrysalis-0.9.1.zip`
- Checksums and per-file inventory: `release/chrysalis-0.9.1.sha256` and
  `release/chrysalis-0.9.1-build-manifest.json`

## Reproducible production build

Build inputs are this working tree, `package-lock.json`, checked-in assets and the
strict allowlist `scripts/package-files.json`. The toolchain used here is Node
20.17.0/npm 10.8.2 and Python 3.13.1. `.nvmrc` records the Node version. No global
esbuild/TypeScript install is used; `npm ci` uses the lockfile.

From repository root:

```sh
cd extension
npm ci
npm run check
npm run package
```

`npm ci` replaces only this package's installed dependencies. Build clears only
`extension/dist`. Packaging replaces only its named generated version artifacts in
`extension/release`; it never reads a Chrome profile or exports user data.

`package` verifies exact production file membership, local references, MV3, CSP,
permission scope and PNG dimensions. The ZIP uses sorted entry names, fixed dates,
0644 permissions and uncompressed entries, avoiding timestamp/compressor variability.
It is intentionally slightly larger than a compressed archive. The package is
extracted through validated paths; every extracted byte is compared to `dist`, then
its manifest is verified again. Only fonts' required license texts accompany assets.
Source, tests, `.env`, screenshots, docs, node_modules and the other apps are excluded.

```sh
npx playwright install chromium
npm run test:package
```

This builds twice, requires byte-identical ZIPs, rejects a deliberately introduced
development file/missing script in a temporary copy, and runs all twelve extension
browser suites against the ZIP-extracted directory. It writes a validation record
bound to the ZIP SHA-256, source revision and source-file digest. Tests use disposable profiles; fixtures are not live-layout
proof. Node/Python versions can change bytes; equivalence across untested toolchains
is not promised. Re-run this command after changing inputs.

To verify a received checksum (from `release/`): macOS `shasum -a 256 -c
chrysalis-0.9.1.sha256`; Linux `sha256sum -c chrysalis-0.9.1.sha256`. On Windows,
`Get-FileHash .\chrysalis-0.9.1.zip -Algorithm SHA256` in PowerShell and compare with
the checksum text. A checksum detects differing bytes; it does not authenticate an
unknown sender. Obtain the files and expected checksum through a trusted source.

## Updates without intentionally resetting data

Keep the same installed folder. Existing repository users: rebuild `extension/dist`,
click **Reload** on its existing Extensions card, then refresh YouTube. Volunteers:
finish/pause first, replace the assets in the same folder with the new extracted
package, click Reload on the existing card, then refresh YouTube. Do not uninstall
or load another copy to update. Changing installation identity/folder can separate
its storage; moving to a later Store installation is not an implemented data migration.
See Chrome's [extension ID guidance](https://developer.chrome.com/docs/extensions/reference/manifest/key).

Version 0.9.1 preserves the retention design introduced in 0.9.0. Settings survive updates. Existing 0.8.0 plaintext stays untouched until you open Session history and explicitly confirm encrypting it with a new password or deleting it. Encryption retains the latest 100 completed sessions and archives an unfinished earlier plan without resuming it. The confirmation explains discarded technical records and any history limit. Cancel preserves the old record. Unreadable old data is not silently reset.

New session activity, including unfinished timers and temporary history, disappears when Chrome restarts or Chrysalis is reloaded, updated or disabled. Finish first and enable/unlock optional encrypted history if you want completed records to survive. A worker wake-up does not clear browser memory or relock history. A browser restart does both; no unfinished timer resumes. Unlocking is never required for planning or viewing controls.

Passwords are 12–128 characters; use a strong unique passphrase. No password recovery or export/import exists. Lock hides saved records while allowing new temporary sessions. Unlock merges them into the latest 100 saved records. If an encrypted save fails, keep Chrome open and Retry in history. Reloading or closing Chrome can lose unsaved changes. Clear session history can delete encrypted history without a password after confirmation.

Unpacked installations have no automatic update feed. Do not downgrade as a repair. The original 0.8.0 and 0.9.0 ZIPs/tags remain preserved; website rollback is separate.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| Manifest missing / cannot load | Extract the ZIP first. Select the folder containing `manifest.json`, not its parent, source, or ZIP. Rebuild if a referenced file is missing. |
| Extension disabled after reload | Keep Developer mode on for unpacked use; check Chrome's card for an error. Managed policy may prevent loading. Do not disable browser security or bypass organizational restrictions. |
| No indicator or controls | Confirm `www.youtube.com` in desktop Chrome, extension enabled, and website access allowed in its Details → Site access controls where available. An explicitly paused extension stays paused; enable it in settings if desired. The Show session indicator preference only hides the expanded timer and never disables tracking. Refresh tabs already open when installing/updating. A fresh visit opens the introduction automatically; existing sessions and introductions already dismissed in this visit are not restarted. Incognito/mobile/alternate origins are unsupported. |
| Home/related/Shorts still visible | Check the independent toggle and appropriate page. Open the control status disclosure. Unrecognized or empty layouts stay visible; Shorts URLs and unrelated surfaces are not blocked. Use Restore ordinary layout or turn that toggle off. |
| Timer stopped | Check session pause, global pause, target-independent state and focused active tab. Recovery after a >5-second signal gap needs Resume. It is foreground time, not exact player time. |
| No checkpoint | A target is optional. Check prompts enabled and whether this target was already dismissed/acknowledged. A new explicit target/additional duration rearms it; changing intention alone does not. Fullscreen uses the centered check-in and a compact restore tab. |
| Old UI remains after reload/disable | Return to the tab; visible old contexts normally remove their UI within about five seconds. Hidden/frozen contexts can be delayed. Refresh gives immediate cleanup and loads the new script when enabled. |
| Save/read failure | Keep Chrome open, check the visible error, and use Retry in history for an encrypted save failure. Reload discards unsaved activity. Do not assume Saved unless confirmed. Unknown schemas/corrupt data are preserved, not repaired automatically. |
| Want to delete data | Settings → history → Delete session for one record; Clear session history for all completed records; Delete all Chrysalis data separately clears preferences/current session too. Confirm the dialog. None of these deletes YouTube history. |
| Data cannot be read even after retry | Preserve the profile if you want recovery help; no record export/automatic repair is implemented. As an explicit destructive last resort, remove the extension in Chrome and reinstall for a fresh installation. This loses its local data. |

For support, describe the extension version, Chrome/OS version, page type (Home,
watch, search…), action and visible error. Do not send profile files, storage dumps,
video URLs, history, account details or personal notes. Screenshots are optional;
review/redact anything you do not want to disclose. Use the organizer's agreed
contact channel; this preview has no remote support uploader.
