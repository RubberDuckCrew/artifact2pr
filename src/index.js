"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = __importDefault(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const rest_1 = require("@octokit/rest");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const token = core_1.default.getInput('github-token', { required: true });
        // TODO: Add support for specifying specific artifact names
        const commentIfNoArtifacts = core_1.default.getInput('comment-if-no-artifacts', { required: false }); // If no input, this will be an empty string ""
        const octokit = new rest_1.Octokit({ auth: token });
        const context = github.context;
        // Just react to pull request events
        if (!context.payload.pull_request) {
            core_1.default.info('This action only runs on pull requests.');
            return;
        }
        const prNumber = context.payload.pull_request.number;
        const { owner, repo } = context.repo;
        // Fetch artifacts from the workflow run
        const runId = context.runId;
        const artifacts = yield octokit.actions.listWorkflowRunArtifacts({
            owner,
            repo,
            run_id: runId,
        });
        if (artifacts.data.artifacts.length === 0) {
            core_1.default.info('No artifacts found for workflow run with id: ' + runId);
            if (commentIfNoArtifacts === 'true') {
                yield octokit.issues.createComment({
                    owner,
                    repo,
                    issue_number: prNumber,
                    body: ':warning: **No artifacts found**',
                });
            }
            return;
        }
        // Build the comment body with artifact links
        const artifactLinks = artifacts.data.artifacts.map((a) => `- [${a.name}](${a.archive_download_url})`).join('\n');
        const body = `:package: **Build Artifacts**\n\n${artifactLinks}`;
        // Kommentar posten
        yield octokit.issues.createComment({
            owner,
            repo,
            issue_number: prNumber,
            body,
        });
        core_1.default.info('Comment posted to PR: ' + prNumber);
        core_1.default.info('Artifacts: ' + artifactLinks);
    });
}
main().catch(err => core_1.default.setFailed(err.message));
