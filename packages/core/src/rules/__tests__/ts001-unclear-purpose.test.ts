import { describe, expect, it } from "vitest";
import { ts001UnclearPurpose } from "../ts001-unclear-purpose.js";
import type { ToolDefinition } from "../../types/index.js";

/** Helper to create a minimal tool definition for testing */
function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
	return {
		serverName: "test-server",
		name: "test_tool",
		description: "Retrieves user profile information from the database by user ID.",
		inputSchema: { type: "object", properties: {} },
		source: "file",
		...overrides,
	};
}

describe("TS001: unclear-purpose", () => {
	describe("passing cases", () => {
		it("should pass a well-written description", () => {
			const tool = makeTool({
				name: "get_user",
				description:
					"Retrieves a user profile by ID from the users database. Returns name, email, and role.",
			});
			const diags = ts001UnclearPurpose.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass a description with multiple action verbs", () => {
			const tool = makeTool({
				name: "sync_data",
				description:
					"Fetches records from the source system, transforms them into the target format, and uploads them to the destination.",
			});
			const diags = ts001UnclearPurpose.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass a description that starts with a verb", () => {
			const tool = makeTool({
				name: "create_issue",
				description: "Creates a new issue in the project tracker with the given title and body.",
			});
			const diags = ts001UnclearPurpose.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("missing description", () => {
		it("should flag a tool with no description", () => {
			const tool = makeTool({ description: undefined });
			const diags = ts001UnclearPurpose.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].ruleId).toBe("TS001");
			expect(diags[0].severity).toBe("error");
			expect(diags[0].message).toContain("no description");
		});

		it("should flag a tool with an empty string description", () => {
			const tool = makeTool({ description: "" });
			const diags = ts001UnclearPurpose.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain("no description");
		});

		it("should flag a tool with a whitespace-only description", () => {
			const tool = makeTool({ description: "   " });
			const diags = ts001UnclearPurpose.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain("no description");
		});
	});

	describe("too-short description", () => {
		it("should warn about very short descriptions", () => {
			const tool = makeTool({ description: "Gets a user." });
			const diags = ts001UnclearPurpose.check(tool);
			const shortDiag = diags.find((d) => d.message.includes("characters"));
			expect(shortDiag).toBeDefined();
			expect(shortDiag!.severity).toBe("warning");
		});

		it("should not flag descriptions at exactly the minimum length", () => {
			// 20 chars: "Searches for records."
			const tool = makeTool({ description: "Searches for records." });
			const diags = ts001UnclearPurpose.check(tool);
			const shortDiag = diags.find((d) => d.message.includes("characters"));
			expect(shortDiag).toBeUndefined();
		});
	});

	describe("tautological description", () => {
		it("should flag a description that just repeats the tool name", () => {
			const tool = makeTool({
				name: "get_user",
				description: "get user",
			});
			const diags = ts001UnclearPurpose.check(tool);
			const tautDiag = diags.find((d) => d.message.includes("tautological"));
			expect(tautDiag).toBeDefined();
			expect(tautDiag!.severity).toBe("error");
		});

		it("should flag 'Tool to <name>' patterns", () => {
			const tool = makeTool({
				name: "search_documents",
				description: "A tool to search documents.",
			});
			const diags = ts001UnclearPurpose.check(tool);
			const tautDiag = diags.find((d) => d.message.includes("tautological"));
			expect(tautDiag).toBeDefined();
		});

		it("should flag descriptions using only words from the tool name", () => {
			const tool = makeTool({
				name: "create_project",
				description: "Create project.",
			});
			const diags = ts001UnclearPurpose.check(tool);
			const tautDiag = diags.find((d) => d.message.includes("tautological"));
			expect(tautDiag).toBeDefined();
		});

		it("should NOT flag a description that adds meaningful context", () => {
			const tool = makeTool({
				name: "create_project",
				description:
					"Creates a new project in the workspace with the specified name and template configuration.",
			});
			const diags = ts001UnclearPurpose.check(tool);
			const tautDiag = diags.find((d) => d.message.includes("tautological"));
			expect(tautDiag).toBeUndefined();
		});
	});

	describe("missing action verb", () => {
		it("should warn about descriptions without action verbs", () => {
			const tool = makeTool({
				name: "user_profile",
				description: "The user profile information including name, email, and role from the database.",
			});
			const diags = ts001UnclearPurpose.check(tool);
			const verbDiag = diags.find((d) => d.message.includes("action verb"));
			expect(verbDiag).toBeDefined();
			expect(verbDiag!.severity).toBe("warning");
		});

		it("should not flag descriptions that contain a verb", () => {
			const tool = makeTool({
				name: "user_profile",
				description: "Retrieves the user profile information including name, email, and role.",
			});
			const diags = ts001UnclearPurpose.check(tool);
			const verbDiag = diags.find((d) => d.message.includes("action verb"));
			expect(verbDiag).toBeUndefined();
		});

		it("should recognise verb variants (e.g. 'creates' not just 'create')", () => {
			const tool = makeTool({
				name: "new_ticket",
				description: "This endpoint creates a new support ticket in the helpdesk system.",
			});
			const diags = ts001UnclearPurpose.check(tool);
			const verbDiag = diags.find((d) => d.message.includes("action verb"));
			expect(verbDiag).toBeUndefined();
		});
	});

	describe("diagnostics metadata", () => {
		it("should include correct toolName and serverName", () => {
			const tool = makeTool({
				serverName: "my-server",
				name: "my_tool",
				description: undefined,
			});
			const diags = ts001UnclearPurpose.check(tool);
			expect(diags[0].toolName).toBe("my_tool");
			expect(diags[0].serverName).toBe("my-server");
		});

		it("should include a suggestion for every diagnostic", () => {
			const tool = makeTool({ description: undefined });
			const diags = ts001UnclearPurpose.check(tool);
			for (const diag of diags) {
				expect(diag.suggestion).toBeDefined();
				expect(diag.suggestion!.length).toBeGreaterThan(0);
			}
		});
	});
});
