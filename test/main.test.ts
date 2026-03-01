import { beforeEach, describe, expect, it, vi } from "vitest";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";
import {
  getArtifacts,
  checkIfArtifacts,
  buildArtifactLinks,
  Artifact,
} from "../src/artifacts";
import { CommentResponse, postComment } from "../src/commentPost";
import { deleteExistingComments } from "../src/commentDelete";
import { main } from "../src/main";

vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
  info: vi.fn(),
  setFailed: vi.fn(),
}));
vi.mock("@actions/github", () => ({
  context: {
    payload: {},
    repo: { owner: "owner", repo: "repo" },
    runId: 123,
  },
}));
vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(function (opts?: { auth?: string }) {
    return { __auth: opts?.auth };
  }),
}));
vi.mock("../src/artifacts", () => ({
  getArtifacts: vi.fn(),
  checkIfArtifacts: vi.fn(),
  buildArtifactLinks: vi.fn(),
}));
vi.mock("../src/commentPost", () => ({
  postComment: vi.fn(),
}));
vi.mock("../src/commentDelete", () => ({
  deleteExistingComments: vi.fn(),
}));

describe("main()", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    github.context.payload = { pull_request: { number: 11 } };
    github.context.repo.owner = "owner";
    github.context.repo.repo = "repo";
    github.context.runId = 123;

    vi.mocked(core).getInput.mockImplementation((name: string) => {
      if (name === "github-token") return "secret";
      if (name === "comment-heading") return "Heading";
      if (name === "comment-if-no-artifacts") return "";
      return "";
    });
    vi.mocked(checkIfArtifacts).mockResolvedValue(true);
    vi.mocked(getArtifacts).mockResolvedValue([]);
    vi.mocked(buildArtifactLinks).mockReturnValue("- [a](l)");
    vi.mocked(postComment).mockResolvedValue({
      data: { id: 1 },
    } as CommentResponse);
    vi.mocked(deleteExistingComments).mockResolvedValue();
  });

  it("posts a comment when artifacts exist", async () => {
    vi.mocked(getArtifacts).mockResolvedValue([
      { id: 10, name: "a" } as Artifact,
    ]);

    await main();

    expect(Octokit).toHaveBeenCalledWith({ auth: "secret" });
    expect(deleteExistingComments).toHaveBeenCalled();
    expect(postComment).toHaveBeenCalledWith(
      { __auth: "secret" },
      "owner",
      "repo",
      11,
      "<!-- RubberDuckCrew/artifact2pr - b3duZXIvcmVwbyMxMQ== -->",
      "Heading",
      "- [a](l)",
    );
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining("✅ Comment posted"),
    );
  });

  it("throws when not running on a pull request", async () => {
    github.context.payload = {};

    await expect(main()).rejects.toThrow(
      "This action only runs on pull requests.",
    );
    expect(deleteExistingComments).not.toHaveBeenCalled();
    expect(postComment).not.toHaveBeenCalled();
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it("does not post when no artifacts and no comment message", async () => {
    vi.mocked(checkIfArtifacts).mockResolvedValue(false);

    await main();

    expect(postComment).not.toHaveBeenCalled();
    expect(core.info).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ No artifacts found for workflow run 123"),
    );
  });
});
