# Chrysalis 0.9.1 — publisher upload handoff

No Store item was created, ZIP uploaded, account setting certified, or extension submitted/published by this preparation.

## Exact upload

Upload only `chrysalis-0.9.1.zip` from this kit (repository path `extension/release/chrysalis-0.9.1.zip`). Do not upload this folder, source, screenshots or an unpacked directory.

SHA-256: `a0e274468da4dc46ee33d67accdc8f9cf660a85277cfbdf3f79867651da34765`

Release source identity is recorded in `build-manifest.json`; validation binds all twelve packaged browser suites to the ZIP checksum. See `docs/releases/0.9.1/startup.md` for startup measurements and CI evidence. Do not reuse the older 0.9.0 CI run as evidence for this release.

The verified 0.9.0 ZIP remains unchanged at SHA-256 `781a8fd16c7dec02710aafd17115cd63bfb3aad1a2ec1447457efb98c65980f2`. The public policy currently describes 0.9.0; this preparation updates the synchronized 0.9.1 source locally with unchanged storage behavior. No public-site deployment or Store submission is part of this release preparation.

## Paste-ready materials

- `LISTING.md`: name **Chrysalis**, exact manifest short description and complete detailed description. Desktop YouTube only; no universal layout, attention, productivity or mobile-app claim.
- `DISCLOSURES.md` / source `STORE_DRAFT.md`: single purpose, storage and YouTube access justifications, remote-code answer **No**, proposed data categories and limitations.
- Privacy URL: https://chrysalis-extension-pages.vercel.app/privacy
- Support URL: https://chrysalis-extension-pages.vercel.app/contact
- Public issue tracker: https://github.com/CatInTheRiceHat/Chrysalis/issues
- `icon-128.png`, `promo-440x280.png`, and the five 1280×800 PNGs under `screenshots/`. Actual release UI with no participant data; inventory includes hashes. No optional marquee or demo video was invented.
- `STORE_IDENTITY.md`: unpacked-to-Store installations have separate storage; settings/history do not automatically transfer. Keep the old installation until deciding what to retain. No export/import exists.

## Personal account and certification steps

1. Choose the Google account that will own the item. Register in the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole), accept its developer agreement/policies and pay the one-time registration fee if not already registered. We have not checked your Store account status. [Official registration](https://developer.chrome.com/docs/webstore/register).
2. Enable Google two-step verification. Enter your actual publisher name and verify the contact email through the link Google sends. Provide any identity/contact/address information the dashboard requires; don't substitute the project name for your legal identity. Select trader/non-trader status truthfully and complete applicable trader verification. [Account setup](https://developer.chrome.com/docs/webstore/set-up-account), [account security](https://developer.chrome.com/docs/webstore/program-policies/policies), [trader disclosure](https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure).
3. When ready, create the Store item yourself and upload the exact ZIP above. Use the prepared English listing and artwork, choose the actual available category, distribution countries and public/unlisted/private visibility. No Store URL, item ID or publisher name has been invented. A private/unlisted item still receives policy review.
4. Review the actual dashboard data-category wording. Proposed selections: **User activity**, **Website content**, **Web history** (transient address/link inspection, not saved URL history), **Authentication information** (local history password/key, not a login account). No upload is not the same as no data handling. Free text can contain user-supplied personal information; the extension does not solicit identity, financial, health, personal-communications or precise-location data.
5. Personally certify accurate data use, Limited Use and consistency with the public policy: no sale or unrelated transfer, no purposes unrelated to the stated single purpose, no creditworthiness/lending use. Confirm narrow permissions and no remote code, and that the listing and privacy answers describe the uploaded bytes. These are prepared answers, not certifications already made in your name. [Official privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy).
6. Review the included reviewer flow. No account/password is needed for viewing; reviewers choose their own password to test optional encrypted history. Password recovery is unavailable. When ready for review, submission/publication is your separate action; it has not been performed in this task.

## Storage status — explicit limitations

No unresolved storage implementation or product-choice blocker is identified for a fresh 0.9.1 Store installation. Activity is session-memory-only by default; optional completed history uses AES-256-GCM with PBKDF2-SHA256, 600,000 iterations, random salt/nonces and a key held only in trusted browser-session memory. Preferences remain unencrypted and contain no free text/activity. Viewing never requires unlocking.

**Legacy plaintext remains until the user chooses:** an existing unpacked 0.8.0 installation keeps its old plaintext record until explicit encryption or confirmed deletion. This is intentional preservation, prominently disclosed, not a claim that old records became encrypted automatically. Successful migration replaces the sole old plaintext root; it does not erase device backups or forensic disk remnants. A future Store installation does not automatically import that older installation's data. Browser restart/reload/update/disable loses unfinished sessions, temporary history and unsaved changes; forgotten passwords cannot be recovered.

Google must still assess compliance, including local-data handling and migration; no approval is guaranteed. If a reviewer requires a different migration policy, that would require another reviewed release rather than changing the verified 0.9.1 ZIP silently. [Official User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq).
