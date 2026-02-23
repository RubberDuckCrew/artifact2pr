import { describe, it, expect, vi, beforeEach } from "vitest";
import { Octokit } from "@octokit/rest";
import { postComment } from "../src/commentPost";

interface MockOctokit {
  issues: { createComment: ReturnType<typeof vi.fn> };
}

describe("commentPost", () => {
  let mockOctokit: MockOctokit;

  beforeEach(() => {
    mockOctokit = {
      issues: {
        createComment: vi.fn(),
      },
    };
    vi.clearAllMocks();
  });

  describe("postComment", () => {
    it("should post comment with correct body", async () => {
      const mockResponse = {
        data: { id: 123, body: "test comment" },
      };
      mockOctokit.issues.createComment.mockResolvedValue(mockResponse);

      const result = await postComment(
        mockOctokit as unknown as Octokit,
        "owner",
        "repo",
        42,
        "<!-- identifier -->",
        "## Artifacts",
        "- [artifact1](link1)\n- [artifact2](link2)",
      );

      expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        issue_number: 42,
        body: "<!-- identifier -->\n\n## Artifacts\n\n- [artifact1](link1)\n- [artifact2](link2)",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should correctly format comment body with identifier, heading and links", async () => {
      const mockResponse = { data: { id: 456 } };
      mockOctokit.issues.createComment.mockResolvedValue(mockResponse);

      await postComment(
        mockOctokit as unknown as Octokit,
        "testowner",
        "testrepo",
        10,
        "<!-- test-id -->",
        "# Build Artifacts",
        "- [build.zip](https://example.com/build.zip)",
      );

      expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
        owner: "testowner",
        repo: "testrepo",
        issue_number: 10,
        body: "<!-- test-id -->\n\n# Build Artifacts\n\n- [build.zip](https://example.com/build.zip)",
      });
    });

    it("should handle empty artifact links", async () => {
      const mockResponse = { data: { id: 789 } };
      mockOctokit.issues.createComment.mockResolvedValue(mockResponse);

      await postComment(
        mockOctokit as unknown as Octokit,
        "owner",
        "repo",
        1,
        "<!-- id -->",
        "Heading",
        "",
      );

      expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        issue_number: 1,
        body: "<!-- id -->\n\nHeading\n\n",
      });
    });
  });
});
