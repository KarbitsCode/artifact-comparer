# artifact-comparer
Composite GitHub Action to compare artifact file sizes

This action is a reusable combination of:
1. Downloading the previous/base artifact (via `dawidd6/action-download-artifact@v19`)
2. Comparing it against your current build output path (file, directory, or glob pattern) and writing a markdown report

Example usage:

```yaml
- uses: KarbitsCode/artifact-comparer@main
  id: compare
  with:
    artifact-name: windows-latest-build
    path: ./out/**/*
```

The action outputs:
- `comparison-result` JSON with base/head total size and delta
- a GitHub Actions step summary table with per-file KB before/after and delta (`NEW`/`REMOVED`/`±n KB`)

Implementation notes:
- the downloaded base artifact directory is automatically cleaned up at the end of the composite action (`if: always()` cleanup step)
- comparer logic runs inline via `actions/github-script@v8.0.0` (no action-local npm install/runtime dependencies)
- downloading artifacts requires a token with workflow permission `actions: read` (for example `permissions: { actions: read }`); by default this uses `GITHUB_TOKEN`, but you can pass a different token via the `github-token` input if the default token is too restricted
