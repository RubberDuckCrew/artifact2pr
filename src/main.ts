import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";
import packageJson from "../package.json";
import {
  buildArtifactLinks,
  checkIfArtifacts,
  getArtifacts,
} from "./artifacts";
import { postComment } from "./commentPost";
import { deleteExistingComments } from "./commentDelete";

export async function main(): Promise<void> {
  const token = core.getInput("github-token", { required: true });
  const heading = core.getInput("comment-heading", { required: true });
  const commentIfNoArtifacts = core.getInput("comment-if-no-artifacts");

  const octokit = new Octokit({ auth: token });
  core.info(`🛠️ Running RubberDuckCrew/artifact2pr@v${packageJson.version}`);

  const { owner, repo, prNumber, identifier, runId } = parseContext();

  const artifacts = await getArtifacts(octokit, owner, repo, runId);
  core.info(`📦 Found ${artifacts.length} artifacts for run ${runId}`);

  await deleteExistingComments(octokit, owner, repo, prNumber, identifier);

  const hasArtifacts = await checkIfArtifacts(
    octokit,
    artifacts,
    owner,
    repo,
    prNumber,
    commentIfNoArtifacts,
  );
  if (!hasArtifacts) {
    core.info(`⚠️ No artifacts found for workflow run ${runId}`);
    return;
  }

  const artifactLinks = buildArtifactLinks(artifacts, owner, repo, runId);
  core.info("📦 Artifacts: \n" + artifactLinks);

  const comment = await postComment(
    octokit,
    owner,
    repo,
    prNumber,
    identifier,
    heading,
    artifactLinks,
  );
  core.info(`✅ Comment posted to PR ${prNumber} with ID ${comment.data.id}`);
}

function parseContext(): {
  owner: string;
  repo: string;
  prNumber: number;
  identifier: string;
  runId: number;
} {
  if (!github.context.payload.pull_request) {
    throw new Error("This action only runs on pull requests.");
  }

  const prNumber = github.context.payload.pull_request.number;
  const { owner, repo } = github.context.repo;
  const identifier =
    "<!-- RubberDuckCrew/artifact2pr - " +
    Buffer.from(`${owner}/${repo}#${prNumber}`).toString("base64") +
    " -->";
  const runId = github.context.runId;

  return { owner, repo, prNumber, identifier, runId };
}
