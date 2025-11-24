import { Octokit } from "@octokit/rest";
import * as core from "@actions/core";

export async function deleteExistingComments(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number,
    identifier: string
): Promise<void> {
    const comments = await octokit.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
    });
    const existing = comments.data.filter((comment) =>
        comment.body?.startsWith(identifier)
    );
    for (const comment of existing) {
        await deleteComment(octokit, owner, repo, prNumber, comment.id);
    }
}

async function deleteComment(
    octokit: Octokit,
    owner: string,
    repo: string,
    prNumber: number,
    comment_id: number
): Promise<void> {
    await octokit.issues.deleteComment({
        owner,
        repo,
        comment_id,
    });
    core.info(
        `🗑️ Deleted existing comment with ID ${comment_id} on PR ${prNumber}`
    );
}
