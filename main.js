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

    const artifacts = await octokit.paginate(
      octokit.rest.actions.listArtifactsForRepo,
      {
        owner,
        repo,
        per_page: 100,
      }
    );

    const baseArtifact = artifacts
      .filter((artifact) => artifact.name === baseArtifactName)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const headArtifact = artifacts
      .filter((artifact) => artifact.name === headArtifactName)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

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
      baseSizeBytes === 0
        ? null
        : Number(((diffBytes / baseSizeBytes) * 100).toFixed(2));

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.setFailed(errorMessage);
  }
}

run();
