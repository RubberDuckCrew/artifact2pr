import { Octokit } from "@octokit/rest";

export type Artifact = Awaited<
  ReturnType<Octokit["actions"]["listWorkflowRunArtifacts"]>
>["data"]["artifacts"][number];

export async function getArtifacts(
  octokit: Octokit,
  owner: string,
  repo: string,
  runId: number,
): Promise<Artifact[]> {
  const response = await octokit.actions.listWorkflowRunArtifacts({
    owner,
    repo,
    run_id: runId,
  });
  return response.data.artifacts;
}

export async function checkIfArtifacts(
  octokit: Octokit,
  artifacts: Artifact[],
  owner: string,
  repo: string,
  prNumber: number,
  commentIfNoArtifacts: string,
): Promise<boolean> {
  if (artifacts.length !== 0) return true;

  if (commentIfNoArtifacts.length !== 0) {
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: commentIfNoArtifacts,
    });
  }
  return false;
}

export function buildArtifactLinks(
  artifacts: Artifact[],
  owner: string,
  repo: string,
  runId: number,
): string {
  return artifacts
    .map((artifact) => buildArtifactLink(artifact, owner, repo, runId))
    .join("\n");
}

function buildArtifactLink(
  artifact: Artifact,
  owner: string,
  repo: string,
  runId: number,
): string {
  return `- [${artifact.name}](https://github.com/${owner}/${repo}/actions/runs/${runId}/artifacts/${artifact.id})`;
}
