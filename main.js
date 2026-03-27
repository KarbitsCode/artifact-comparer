const core = require('@actions/core');
const fs = require('node:fs');
const path = require('node:path');

function getDirectorySizeBytes(directoryPath) {
  let totalSize = 0;
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      totalSize += getDirectorySizeBytes(fullPath);
      continue;
    }

    if (entry.isFile()) {
      totalSize += fs.statSync(fullPath).size;
    }
  }

  return totalSize;
}

function getFileSizesKb(directoryPath, basePath = directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return {};
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const sizes = {};

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      Object.assign(sizes, getFileSizesKb(fullPath, basePath));
      continue;
    }

    if (entry.isFile()) {
      const relativePath = path.relative(basePath, fullPath);
      sizes[relativePath] = Math.round(fs.statSync(fullPath).size / 1024);
    }
  }

  return sizes;
}

function escapeMarkdownCell(value) {
  return String(value).replace(/\|/g, '\\|');
}

async function run() {
  try {
    const baseArtifactName = process.env.BASE_ARTIFACT_NAME;
    const baseArtifactPath = process.env.BASE_ARTIFACT_PATH;
    const headArtifactPath = process.env.HEAD_ARTIFACT_PATH;

    if (!baseArtifactName) {
      throw new Error('BASE_ARTIFACT_NAME must be set');
    }

    if (!baseArtifactPath || !headArtifactPath) {
      throw new Error('BASE_ARTIFACT_PATH and HEAD_ARTIFACT_PATH must be set');
    }

    if (!fs.existsSync(headArtifactPath)) {
      throw new Error(`Head artifact path '${headArtifactPath}' not found`);
    }

    const baseSizeBytes = fs.existsSync(baseArtifactPath)
      ? getDirectorySizeBytes(baseArtifactPath)
      : 0;
    const headSizeBytes = getDirectorySizeBytes(headArtifactPath);
    const baseFileSizesKb = getFileSizesKb(baseArtifactPath);
    const headFileSizesKb = getFileSizesKb(headArtifactPath);
    const diffBytes = headSizeBytes - baseSizeBytes;
    const diffPercent =
      baseSizeBytes === 0
        ? null
        : Number(((diffBytes / baseSizeBytes) * 100).toFixed(2));
    const allFiles = Array.from(
      new Set([...Object.keys(baseFileSizesKb), ...Object.keys(headFileSizesKb)])
    ).sort();

    let markdown = '## 📦 Artifact Size Report\n\n';
    markdown += '| File | Before (KB) | After (KB) | Delta |\n';
    markdown += '|------|-------------|------------|-------|\n';

    for (const file of allFiles) {
      const before = baseFileSizesKb[file];
      const after = headFileSizesKb[file];
      let delta = '';

      if (before !== undefined && after !== undefined) {
        const diff = after - before;
        delta = diff === 0 ? '0 KB' : diff > 0 ? `+${diff} KB` : `${diff} KB`;
      } else if (before === undefined && after !== undefined) {
        delta = 'NEW';
      } else if (before !== undefined && after === undefined) {
        delta = 'REMOVED';
      }

      markdown += `| ${escapeMarkdownCell(file)} | ${before ?? '-'} | ${
        after ?? '-'
      } | ${delta} |\n`;
    }

    const result = {
      base: {
        name: baseArtifactName,
        sizeBytes: baseSizeBytes,
      },
      head: {
        name: path.basename(path.resolve(headArtifactPath)),
        sizeBytes: headSizeBytes,
      },
      diff: {
        bytes: diffBytes,
        percent: diffPercent,
      },
    };

    const resultJson = JSON.stringify(result);
    core.setOutput('comparison-result', resultJson);
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
    }
    core.info(`Comparison result: ${resultJson}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(errorMessage);
  }
}

run();
