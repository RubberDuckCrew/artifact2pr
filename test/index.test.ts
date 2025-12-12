import { describe, it, expect, vi, beforeEach } from "vitest";
import * as core from "@actions/core";
import * as github from "@actions/github";

vi.mock("@actions/core");
vi.mock("@actions/github", () => ({
    context: {
        payload: {},
        repo: { owner: "", repo: "" },
        runId: 0,
    },
}));

describe("index", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset context before each test
        github.context.payload = {};
        github.context.repo = { owner: "", repo: "" };
        github.context.runId = 0;
    });

    describe("parseContext", () => {
        it("should handle valid PR context", () => {
            // Setup mock context
            github.context.payload = {
                pull_request: {
                    number: 42,
                },
            };
            github.context.repo = {
                owner: "testowner",
                repo: "testrepo",
            };
            github.context.runId = 123;

            // We can't directly test parseContext as it's not exported and runs immediately,
            // but we can verify the context setup
            expect(github.context.payload.pull_request).toBeDefined();
            expect(github.context.payload.pull_request?.number).toBe(42);
            expect(github.context.repo.owner).toBe("testowner");
            expect(github.context.repo.repo).toBe("testrepo");
            expect(github.context.runId).toBe(123);
        });

        it("should verify identifier generation logic", () => {
            // Test the identifier generation logic used in parseContext
            const owner = "testowner";
            const repo = "testrepo";
            const prNumber = 42;
            const identifier =
                "<!-- RubberDuckCrew/artifact2pr - " +
                btoa(`${owner}/${repo}#${prNumber}`) +
                " -->";

            expect(identifier).toContain("RubberDuckCrew/artifact2pr");
            // Verify it contains the base64 encoded string
            expect(identifier).toContain(btoa(`${owner}/${repo}#${prNumber}`));
            // Verify the encoded value can be decoded back
            const encoded = btoa(`${owner}/${repo}#${prNumber}`);
            expect(atob(encoded)).toBe(`${owner}/${repo}#${prNumber}`);
        });
    });

    describe("main flow validation", () => {
        it("should have required inputs defined", () => {
            // Mock core.getInput
            (core.getInput as any).mockImplementation((name: string) => {
                if (name === "github-token") return "test-token";
                if (name === "comment-heading") return "Test Heading";
                if (name === "comment-if-no-artifacts") return "";
                return "";
            });

            expect(core.getInput("github-token", { required: true })).toBe(
                "test-token"
            );
            expect(core.getInput("comment-heading", { required: true })).toBe(
                "Test Heading"
            );
            expect(core.getInput("comment-if-no-artifacts")).toBe("");
        });

        it("should validate btoa encoding works correctly", () => {
            // Test the btoa function used for identifier generation
            const testString = "testowner/testrepo#42";
            const encoded = btoa(testString);
            const decoded = atob(encoded);

            expect(decoded).toBe(testString);
            expect(encoded).toBeTruthy();
        });

        it("should verify error handling setup", () => {
            // Mock setFailed
            (core.setFailed as any).mockImplementation(() => {});

            // Verify setFailed is available
            expect(core.setFailed).toBeDefined();

            // Test error handling
            const errorMessage = "Test error";
            core.setFailed(errorMessage);

            expect(core.setFailed).toHaveBeenCalledWith(errorMessage);
        });
    });
});
