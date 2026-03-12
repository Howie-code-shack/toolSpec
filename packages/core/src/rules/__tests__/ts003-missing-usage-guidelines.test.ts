import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts003MissingUsageGuidelines } from "../ts003-missing-usage-guidelines.js";

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

describe("TS003: missing-usage-guidelines", () => {
	describe("passing cases", () => {
		it("should pass when description says when to use the tool", () => {
			const tool = makeTool({
				name: "search_docs",
				description:
					"Searches indexed documents by keyword. Use this tool when the user asks to find or look up documentation.",
			});
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when description differentiates from alternatives", () => {
			const tool = makeTool({
				name: "quick_search",
				description:
					"Performs a fast keyword search. Unlike full_search, this only checks titles and does not rank by relevance.",
			});
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when description provides workflow guidance", () => {
			const tool = makeTool({
				name: "commit_changes",
				description:
					"Commits staged changes to the repository. Before calling this, ensure changes are staged with stage_files.",
			});
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass with 'designed for' language", () => {
			const tool = makeTool({
				name: "bulk_import",
				description:
					"Imports records in bulk from a CSV file. Designed for large datasets with more than 1000 rows.",
			});
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should skip tools with no description", () => {
			const tool = makeTool({ description: undefined });
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should skip tools with very short descriptions (TS001 territory)", () => {
			const tool = makeTool({ description: "Gets a user." });
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("failing cases", () => {
		it("should flag a description with no usage guidance at all", () => {
			const tool = makeTool({
				name: "search_documents",
				description:
					"Searches documents in the knowledge base by keyword matching against the full text content.",
			});
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].ruleId).toBe("TS003");
			expect(diags[0].severity).toBe("warning");
			expect(diags[0].message).toContain("does not explain when to use");
		});

		it("should flag a purely descriptive description", () => {
			const tool = makeTool({
				name: "get_metrics",
				description:
					"Retrieves performance metrics from the monitoring system including CPU, memory, and disk usage.",
			});
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags).toHaveLength(1);
		});

		it("should flag a description that only states what the tool does", () => {
			const tool = makeTool({
				name: "send_email",
				description:
					"Sends an email to the specified recipient with the given subject and body content.",
			});
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags).toHaveLength(1);
		});
	});

	describe("diagnostics metadata", () => {
		it("should include correct toolName and serverName", () => {
			const tool = makeTool({
				serverName: "my-server",
				name: "my_tool",
				description:
					"Retrieves user profile information from the database by user ID and returns it.",
			});
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags.length).toBeGreaterThan(0);
			expect(diags[0].toolName).toBe("my_tool");
			expect(diags[0].serverName).toBe("my-server");
		});

		it("should include a suggestion", () => {
			const tool = makeTool({
				name: "do_thing",
				description:
					"Performs the primary operation on the given resource and returns the updated state.",
			});
			const diags = ts003MissingUsageGuidelines.check(tool);
			expect(diags.length).toBeGreaterThan(0);
			expect(diags[0].suggestion).toBeDefined();
			expect(diags[0].suggestion).toContain("Use this tool when");
		});
	});
});
