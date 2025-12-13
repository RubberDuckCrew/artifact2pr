import { describe, it, expect, vi, beforeEach } from "vitest";
import { Octokit } from "@octokit/rest";
import {
    getArtifacts,
    checkIfArtifacts,
    buildArtifactLinks,
    Artifact,
} from "../src/artifacts";

describe("artifacts", () => {
    let mockOctokit: Octokit;

    beforeEach(() => {
        mockOctokit = {
            actions: {
                listWorkflowRunArtifacts: vi.fn(),
            },
            issues: {
                createComment: vi.fn(),
            },
        } as any;
    });

    describe("getArtifacts", () => {
        it("should fetch and return artifacts from workflow run", async () => {
            const mockArtifacts = [
                { id: 1, name: "artifact1" },
                { id: 2, name: "artifact2" },
            ];
            (
                mockOctokit.actions.listWorkflowRunArtifacts as any
            ).mockResolvedValue({
                data: { artifacts: mockArtifacts },
            });

            const result = await getArtifacts(
                mockOctokit,
                "owner",
                "repo",
                123
            );

            expect(result).toEqual(mockArtifacts);
            expect(
                mockOctokit.actions.listWorkflowRunArtifacts
            ).toHaveBeenCalledWith({
                owner: "owner",
                repo: "repo",
                run_id: 123,
            });
        });
    });

    describe("checkIfArtifacts", () => {
        it("should return true when artifacts exist", async () => {
            const artifacts: Artifact[] = [
                { id: 1, name: "artifact1" } as Artifact,
            ];

            const result = await checkIfArtifacts(
                mockOctokit,
                artifacts,
                "owner",
                "repo",
                1,
                "No artifacts"
            );

            expect(result).toBe(true);
            expect(mockOctokit.issues.createComment).not.toHaveBeenCalled();
        });

        it("should return false when no artifacts and no comment message", async () => {
            const artifacts: Artifact[] = [];

            const result = await checkIfArtifacts(
                mockOctokit,
                artifacts,
                "owner",
                "repo",
                1,
                ""
            );

            expect(result).toBe(false);
            expect(mockOctokit.issues.createComment).not.toHaveBeenCalled();
        });

        it("should post comment and return false when no artifacts with comment message", async () => {
            const artifacts: Artifact[] = [];
            const commentMessage = "No artifacts found";
            (mockOctokit.issues.createComment as any).mockResolvedValue({});

            const result = await checkIfArtifacts(
                mockOctokit,
                artifacts,
                "owner",
                "repo",
                42,
                commentMessage
            );

            expect(result).toBe(false);
            expect(mockOctokit.issues.createComment).toHaveBeenCalledWith({
                owner: "owner",
                repo: "repo",
                issue_number: 42,
                body: commentMessage,
            });
        });
    });

    describe("buildArtifactLinks", () => {
        it("should build markdown links for single artifact", () => {
            const artifacts: Artifact[] = [
                { id: 123, name: "test-artifact" } as Artifact,
            ];

            const result = buildArtifactLinks(
                artifacts,
                "owner",
                "repo",
                456
            );

            expect(result).toBe(
                "- [test-artifact](https://github.com/owner/repo/actions/runs/456/artifacts/123)"
            );
        });

        it("should build markdown links for multiple artifacts", () => {
            const artifacts: Artifact[] = [
                { id: 1, name: "artifact-one" } as Artifact,
                { id: 2, name: "artifact-two" } as Artifact,
                { id: 3, name: "artifact-three" } as Artifact,
            ];

            const result = buildArtifactLinks(
                artifacts,
                "testowner",
                "testrepo",
                789
            );

            expect(result).toBe(
                "- [artifact-one](https://github.com/testowner/testrepo/actions/runs/789/artifacts/1)\n" +
                    "- [artifact-two](https://github.com/testowner/testrepo/actions/runs/789/artifacts/2)\n" +
                    "- [artifact-three](https://github.com/testowner/testrepo/actions/runs/789/artifacts/3)"
            );
        });

        it("should return empty string for empty artifacts array", () => {
            const artifacts: Artifact[] = [];

            const result = buildArtifactLinks(artifacts, "owner", "repo", 123);

            expect(result).toBe("");
        });
    });
});
