const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    const baseArtifactName = process.env.BASE_ARTIFACT_NAME;
    const headArtifactName = process.env.HEAD_ARTIFACT_NAME;
    const token = process.env.GITHUB_TOKEN;

    if (!baseArtifactName || !headArtifactName) {
      throw new Error('BASE_ARTIFACT_NAME and HEAD_ARTIFACT_NAME must be set');
    }

    if (!token) {
      throw new Error('GITHUB_TOKEN must be set');
    }

    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    // List artifacts for the current repository
    const { data: artifactList } = await octokit.rest.actions.listArtifactsForRepo({
      owner,
      repo,
    });

    const baseArtifact = artifactList.artifacts.find(
      (artifact) => artifact.name === baseArtifactName
    );
    const headArtifact = artifactList.artifacts.find(
      (artifact) => artifact.name === headArtifactName
    );

    if (!baseArtifact) {
      throw new Error(`Base artifact '${baseArtifactName}' not found`);
    }

    if (!headArtifact) {
      throw new Error(`Head artifact '${headArtifactName}' not found`);
    }

    const baseSizeBytes = baseArtifact.size_in_bytes;
    const headSizeBytes = headArtifact.size_in_bytes;
    const diffBytes = headSizeBytes - baseSizeBytes;
    const diffPercent =
      baseSizeBytes === 0 ? 'N/A' : ((diffBytes / baseSizeBytes) * 100).toFixed(2);

    const result = {
      base: {
        name: baseArtifact.name,
        sizeBytes: baseSizeBytes,
      },
      head: {
        name: headArtifact.name,
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
    core.setFailed(error.message);
  }
}

run();
