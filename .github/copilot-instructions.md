# Chrysalis repository guidance

Active product code lives in `extension/` (desktop YouTube Chrome extension) and
`public-site/` (independent static support website). Follow `CLAUDE.md` and each
product's README for builds, tests and data contracts.

Preserve the archived React/Python/Flutter prototypes at their original paths.
Their development status does not authorize production-service or data retirement;
see `deployment/README.md`. Use disposable profiles for extension browser tests,
and separate fixture results from actual live YouTube observations.
