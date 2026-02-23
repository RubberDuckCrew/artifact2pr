import { Octokit } from "@octokit/rest";

type CommentResponse = Awaited<ReturnType<Octokit["issues"]["createComment"]>>;

export async function postComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  identifier: string,
  heading: string,
  artifactLinks: string,
): Promise<CommentResponse> {
  return await octokit.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: buildCommentBody(identifier, heading, artifactLinks),
  });
}

function buildCommentBody(
  identifier: string,
  heading: string,
  artifactLinks: string,
): string {
  return `${identifier}\n\n${heading}\n\n${artifactLinks}`;
}
