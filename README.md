# artifact-comparer
Composite GitHub Action to compare artifact file sizes

This action is a reusable combination of:
1. Downloading the previous/base artifact (via `dawidd6/action-download-artifact@v19`)
2. Comparing it against your current build directory and writing a markdown report

Equivalent usage:

```yaml
- uses: KarbitsCode/artifact-comparer@main
  id: compare
  with:
    base-artifact-name: windows-latest-build
    head-artifact-dir: ./out
```

The action outputs:
- `comparison-result` JSON with base/head total size and delta
- a GitHub Actions step summary table with per-file KB before/after and delta (`NEW`/`REMOVED`/`±n KB`)

Implementation notes:
- the downloaded base artifact directory is automatically cleaned up at the end of the composite action (`if: always()` cleanup step)
