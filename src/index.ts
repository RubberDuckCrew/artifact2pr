import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";
import packageJson from "../package.json";

main().catch((err) => core.setFailed(err.message));

async function main(): Promise<void> {
    const token = core.getInput("github-token", { required: true });
    const heading = core.getInput("comment-heading", { required: true });
    const commentIfNoArtifacts = core.getInput("comment-if-no-artifacts");
    const octokit = new Octokit({ auth: token });
    core.info(`🛠️ Running RubberDuckCrew/artifact2pr@v${packageJson.version}`);

    // Check if the action is triggered by a pull request
    if (!github.context.payload.pull_request) {
        core.info("⚠️ This action only runs on pull requests.");
        return;
    }

    const prNumber = github.context.payload.pull_request.number;
    const { owner, repo } = github.context.repo;
    const identifier =
        "<!-- RubberDuckCrew/artifact2pr - " +
        btoa(`${owner}/${repo}#${prNumber}`) +
        " -->";

    // Fetch artifacts from the workflow run
    const runId = github.context.runId;
    const artifacts = await octokit.actions.listWorkflowRunArtifacts({
        owner,
        repo,
        run_id: runId,
    });
    core.info(
        `📦 Found ${artifacts.data.artifacts.length} artifacts for run ${runId}`
    );

    // Delete existing comment if it exists
    const comments = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
    });
    const existing = comments.data.find((c) => c.body?.startsWith(identifier));
    if (existing) {
        await octokit.issues.deleteComment({
            owner,
            repo,
            comment_id: existing.id,
        });
        core.info(
            `🗑️ Deleted existing comment with ID ${existing.id} on PR ${prNumber}`
        );
    }

    // If no artifacts are found, optionally comment and exit
    if (artifacts.data.artifacts.length === 0) {
        core.info(`⚠️ No artifacts found for workflow run ${runId}`);
        if (commentIfNoArtifacts.length !== 0) {
            await octokit.issues.createComment({
                owner,
                repo,
                issue_number: prNumber,
                body: commentIfNoArtifacts,
            });
        }
        return;
    }

    // Build the comment body with artifact links
    const artifactLinks = artifacts.data.artifacts
        .map(
            (artifact) =>
                `- [${artifact.name}](https://github.com/${owner}/${repo}/actions/runs/${runId}/artifacts/${artifact.id})`
        )
        .join("\n");
    core.info("📦 Artifacts: " + artifactLinks);

    // Post the new comment with artifact links
    const body = `${identifier}\n\n${heading}\n\n${artifactLinks}`;
    const comment = await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: body,
    });
    core.info(`✅ Comment posted to PR ${prNumber} with ID ${comment.data.id}`);
}
