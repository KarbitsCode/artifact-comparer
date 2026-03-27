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
    const diffBytes = headSizeBytes - baseSizeBytes;
    const diffPercent =
      baseSizeBytes === 0
        ? null
        : Number(((diffBytes / baseSizeBytes) * 100).toFixed(2));

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
    core.info(`Comparison result: ${resultJson}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(errorMessage);
  }
}

run();
