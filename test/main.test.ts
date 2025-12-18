import { beforeEach, describe, expect, it, vi } from "vitest";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";
import * as artifactsMod from "../src/artifacts";
import * as commentMod from "../src/commentPost";
import * as deleteMod from "../src/commentDelete";
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
    Octokit: vi.fn().mockImplementation(function (opts: any) {
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

(globalThis as any).btoa = (str: string) =>
    (globalThis as any).Buffer.from(str).toString("base64");

describe("main()", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("posts a comment when artifacts exist", async () => {
        (core.getInput as any).mockImplementation((name: string) => {
            if (name === "github-token") return "secret";
            if (name === "comment-heading") return "## Artifacts";
            return "";
        });

        github.context.payload = { pull_request: { number: 11 } };
        (github.context as any).repo = { owner: "o", repo: "r" };
        github.context.runId = 555;

        (artifactsMod.getArtifacts as any).mockResolvedValue([
            { id: 10, name: "a" },
        ]);
        (artifactsMod.checkIfArtifacts as any).mockResolvedValue(true);
        (artifactsMod.buildArtifactLinks as any).mockReturnValue("- [a](l)");
        (commentMod.postComment as any).mockResolvedValue({ data: { id: 1 } });
        (deleteMod.deleteExistingComments as any).mockResolvedValue({});

        await main();

        expect(Octokit).toHaveBeenCalledWith({ auth: "secret" });
        expect(commentMod.postComment).toHaveBeenCalled();
        expect(core.info).toHaveBeenCalledWith(
            expect.stringContaining("✅ Comment posted")
        );
    });

    it("throws when not running on a pull request", async () => {
        github.context.payload = {};

        await expect(main()).rejects.toThrow(
            "This action only runs on pull requests."
        );
    });

    it("does not post when no artifacts and no comment message", async () => {
        (core.getInput as any).mockImplementation((name: string) => {
            if (name === "github-token") return "secret";
            if (name === "comment-heading") return "Heading";
            if (name === "comment-if-no-artifacts") return "";
            return "";
        });

        github.context.payload = { pull_request: { number: 7 } };
        (github.context as any).repo = { owner: "ox", repo: "rx" };
        github.context.runId = 321;

        (artifactsMod.getArtifacts as any).mockResolvedValue([]);
        (artifactsMod.checkIfArtifacts as any).mockResolvedValue(false);
        (deleteMod.deleteExistingComments as any).mockResolvedValue({});

        await main();

        expect(commentMod.postComment).not.toHaveBeenCalled();
        expect(core.info).toHaveBeenCalledWith(
            expect.stringContaining(
                "⚠️ No artifacts found for workflow run 321"
            )
        );
    });
});
