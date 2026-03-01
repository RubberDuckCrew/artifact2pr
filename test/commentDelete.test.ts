import { describe, it, expect, vi, beforeEach } from "vitest";
import { Octokit } from "@octokit/rest";
import * as core from "@actions/core";
import { deleteExistingComments } from "../src/commentDelete";

vi.mock("@actions/core");

interface MockOctokit {
  issues: {
    listComments: ReturnType<typeof vi.fn>;
    deleteComment: ReturnType<typeof vi.fn>;
  };
}

describe("commentDelete", () => {
  let mockOctokit: MockOctokit;

  beforeEach(() => {
    mockOctokit = {
      issues: {
        listComments: vi.fn(),
        deleteComment: vi.fn(),
      },
    };
    vi.clearAllMocks();
  });

  describe("deleteExistingComments", () => {
    it("should delete comments that start with identifier", async () => {
      const identifier = "<!-- test-identifier -->";
      const mockComments = [
        { id: 1, body: "<!-- test-identifier --> Comment 1" },
        { id: 2, body: "Some other comment" },
        { id: 3, body: "<!-- test-identifier --> Comment 2" },
      ];

      mockOctokit.issues.listComments.mockResolvedValue({
        data: mockComments,
      });
      mockOctokit.issues.deleteComment.mockResolvedValue({});

      await deleteExistingComments(
        mockOctokit as unknown as Octokit,
        "owner",
        "repo",
        42,
        identifier,
      );

      expect(mockOctokit.issues.listComments).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        issue_number: 42,
      });
      expect(mockOctokit.issues.deleteComment).toHaveBeenCalledTimes(2);
      expect(mockOctokit.issues.deleteComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        comment_id: 1,
      });
      expect(mockOctokit.issues.deleteComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        comment_id: 3,
      });
      expect(core.info).toHaveBeenCalledWith(
        "🗑️ Deleted existing comment with ID 1 on PR 42",
      );
      expect(core.info).toHaveBeenCalledWith(
        "🗑️ Deleted existing comment with ID 3 on PR 42",
      );
    });

    it("should not delete any comments if none match identifier", async () => {
      const identifier = "<!-- test-identifier -->";
      const mockComments = [
        { id: 1, body: "Comment 1" },
        { id: 2, body: "Comment 2" },
      ];

      mockOctokit.issues.listComments.mockResolvedValue({
        data: mockComments,
      });

      await deleteExistingComments(
        mockOctokit as unknown as Octokit,
        "owner",
        "repo",
        42,
        identifier,
      );

      expect(mockOctokit.issues.listComments).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        issue_number: 42,
      });
      expect(mockOctokit.issues.deleteComment).not.toHaveBeenCalled();
    });

    it("should handle comments with undefined body", async () => {
      const identifier = "<!-- test-identifier -->";
      const mockComments = [
        { id: 1, body: undefined },
        { id: 2, body: "<!-- test-identifier --> Comment" },
      ];

      mockOctokit.issues.listComments.mockResolvedValue({
        data: mockComments,
      });
      mockOctokit.issues.deleteComment.mockResolvedValue({});

      await deleteExistingComments(
        mockOctokit as unknown as Octokit,
        "owner",
        "repo",
        10,
        identifier,
      );

      expect(mockOctokit.issues.deleteComment).toHaveBeenCalledTimes(1);
      expect(mockOctokit.issues.deleteComment).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        comment_id: 2,
      });
    });

    it("should handle empty comments list", async () => {
      const identifier = "<!-- test-identifier -->";

      mockOctokit.issues.listComments.mockResolvedValue({
        data: [],
      });

      await deleteExistingComments(
        mockOctokit as unknown as Octokit,
        "owner",
        "repo",
        42,
        identifier,
      );

      expect(mockOctokit.issues.listComments).toHaveBeenCalledWith({
        owner: "owner",
        repo: "repo",
        issue_number: 42,
      });
      expect(mockOctokit.issues.deleteComment).not.toHaveBeenCalled();
    });
  });
});
