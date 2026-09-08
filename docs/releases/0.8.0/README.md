# Verified 0.8.0 evidence

Implementation revision: `74740a3e609df82479b9a58d1a7e5f7a68abfbcc`.
See [transition record](../../extension-public-site-transition.md) for commands,
interpretation, negative-control results and verification limits.

- `build-manifest.json`: clean source identity, toolchain and source/artifact hashes.
- `validation.json`: all ten fixture browser suites passed against the extracted ZIP.
- `integrated-fixture-report.json`: session lifecycle coverage on controlled pages.
- `integrated-live-report.json`: final extracted ZIP session flows on live signed-out YouTube.
- `viewing-live-report.json`: signed-out live YouTube selector/playback checks.
- `public-site-browser-report.json`: responsive, keyboard, contact and offline checks.
- `capture-report.json`: eight final-package screenshots, their sizes and hashes.

JSON records were copied without alteration from completed runs. Absolute paths identify
this local verification environment and are not production URLs. ZIPs and screenshots
are ignored generated artifacts under `extension/release/`; regenerate from the source
revision using `extension/INSTALL.md`. Later documentation commits do not alter the
verified runtime. No production or participant data is included.
