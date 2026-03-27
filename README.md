# artifact-comparer
Composite GitHub Action to compare artifact file sizes

The action outputs:
- `comparison-result` JSON with base/head total size and delta
- a GitHub Actions step summary table with per-file KB before/after and delta (`NEW`/`REMOVED`/`±n KB`)
