import core from '@actions/core';
import * as github from '@actions/github';
import { Octokit } from '@octokit/rest';

async function main(): Promise<void> {
    const token = core.getInput('github-token', { required: true });
    // TODO: Add support for specifying specific artifact names
    const commentIfNoArtifacts = core.getInput('comment-if-no-artifacts', { required: false }); // If no input, this will be an empty string ""
    const octokit = new Octokit({ auth: token });
    const context = github.context;

    // Just react to pull request events
    if (!context.payload.pull_request) {
        core.info('This action only runs on pull requests.');
        return;
    }

    const prNumber = context.payload.pull_request.number;
    const { owner, repo } = context.repo;

    // Fetch artifacts from the workflow run
    const runId = context.runId;
    const artifacts = await octokit.actions.listWorkflowRunArtifacts({
        owner,
        repo,
        run_id: runId,
    });

    if (artifacts.data.artifacts.length === 0) {
        core.info('No artifacts found for workflow run with id: ' + runId);
        if (commentIfNoArtifacts === 'true') {
            await octokit.issues.createComment({
                owner,
                repo,
                issue_number: prNumber,
                body: ':warning: **No artifacts found**',
            });
        }
        return;
    }

    // Build the comment body with artifact links
    const artifactLinks = artifacts.data.artifacts.map(
        (a) => `- [${a.name}](${a.archive_download_url})`
    ).join('\n');

    const body = `:package: **Build Artifacts**\n\n${artifactLinks}`;

    // Kommentar posten
    await octokit.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
    });

    core.info('Comment posted to PR: ' + prNumber);
    core.info('Artifacts: ' + artifactLinks);
}

main().catch(err => core.setFailed(err.message));