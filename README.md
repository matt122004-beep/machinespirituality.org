# Machine Spirituality Benchmark

Public website for https://machinespirituality.org, maintained by Matthew Korpman.

This repository contains the published static website and its browser data assets. Research source files, working drafts, and historical mockups are maintained separately.

## Hosting

GitHub Pages publishes the repository root from the `main` branch. Commit and push an updated publication bundle to update the site.

The website uses HTML, CSS, and JavaScript with no build step. `.nojekyll` ensures the assets are served unchanged.

## Discovery and security maintenance

After changing browser data or inline JavaScript, run `python3 tools/build-discovery.py` before publishing. This regenerates the static results pages, aggregate downloads and dataset metadata from the same public data the interactive site uses, plus the sitemap, crawler rules and per-page Content Security Policy hashes. No private research inputs are needed.

The site is static: there is no server application, login, database, upload endpoint or API key in the publication bundle. GitHub Pages enforces HTTPS. The Content Security Policy permits local scripts and explicitly hashed inline scripts, blocks plugins and form submissions, and limits external assets to Google Fonts. Referrer information is limited on cross-site navigation. Inline styling remains permitted for the charts and layout.

GitHub Pages does not support arbitrary custom response headers; meta policies cannot supply frame-ancestors or HSTS. Account security and domain ownership verification must be maintained in GitHub and IONOS. Keep two-factor authentication/passkeys, domain renewal and recovery methods current. Do not publish credentials or private transcripts in this repository.

## Aggregate data license

Published aggregate scores, counts, uncertainty intervals and accompanying dataset documentation are licensed by Matthew J. Korpman under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). See [DATA-LICENSE.txt](DATA-LICENSE.txt) for scope and suggested attribution. This is not a repository-wide software or content license; transcripts, quoted model output, code, design, branding and other website prose are outside the grant.

## Readable results and downloads

`results.html` links to every dataset and explains the conversation total. `monologues.html`, `misaligned.html`, `asked-directly.html` and `onset.html` provide full static tables from the same public assets as the charts. `data/all-results.json` bundles all five aggregate datasets with definitions and count scope. The existing `aggregate-results.json` and `.csv` remain two-way-only for compatibility; four separately named JSON/CSV pairs cover the other datasets. Measure-specific denominators are explicit, and absent measures are not zeros. Direct-question quartiles describe answer variation, not confidence intervals. Regenerate with `python3 tools/build-discovery.py` after changing any chart data; do not hand-edit generated exports.
