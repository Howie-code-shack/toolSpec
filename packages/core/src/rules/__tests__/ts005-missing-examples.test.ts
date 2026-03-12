import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts005MissingExamples } from "../ts005-missing-examples.js";

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

describe("TS005: missing-examples", () => {
	describe("passing cases", () => {
		it("should pass when description contains an example", () => {
			const tool = makeTool({
				name: "search_docs",
				description:
					'Searches documents by keyword. Example: {"query": "annual report", "limit": 10}',
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when description uses e.g.", () => {
			const tool = makeTool({
				name: "format_date",
				description:
					'Formats a date string into the target format, e.g. "2024-01-15" → "January 15, 2024".',
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when description uses 'such as'", () => {
			const tool = makeTool({
				name: "get_metrics",
				description:
					"Retrieves system metrics such as CPU usage, memory consumption, and disk I/O rates.",
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when parameters have enum values", () => {
			const tool = makeTool({
				name: "set_status",
				description: "Updates the status of a record in the system.",
				inputSchema: {
					type: "object",
					properties: {
						id: { type: "string" },
						status: { type: "string", enum: ["active", "inactive", "archived"] },
					},
				},
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when parameters have default values", () => {
			const tool = makeTool({
				name: "list_items",
				description: "Lists items from the inventory database.",
				inputSchema: {
					type: "object",
					properties: {
						page: { type: "integer", default: 1 },
						pageSize: { type: "integer", default: 20 },
					},
				},
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when parameters have examples keyword", () => {
			const tool = makeTool({
				name: "search_docs",
				description: "Searches the document index by keyword.",
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string", examples: ["annual report", "Q4 earnings"] },
					},
				},
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should skip tools with no description", () => {
			const tool = makeTool({ description: undefined });
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("complex tools without examples", () => {
		it("should warn for tools with 6+ params and no examples", () => {
			const tool = makeTool({
				name: "create_report",
				description: "Creates an analytical report from the data warehouse.",
				inputSchema: {
					type: "object",
					properties: {
						title: { type: "string" },
						startDate: { type: "string" },
						endDate: { type: "string" },
						format: { type: "string" },
						recipients: { type: "string" },
						filters: { type: "string" },
					},
				},
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].severity).toBe("warning");
			expect(diags[0].message).toContain("6 parameters");
		});
	});

	describe("moderate tools without examples", () => {
		it("should produce info for tools with 3-5 params and no examples", () => {
			const tool = makeTool({
				name: "send_email",
				description: "Sends an email to the specified recipient with subject and body.",
				inputSchema: {
					type: "object",
					properties: {
						to: { type: "string" },
						subject: { type: "string" },
						body: { type: "string" },
					},
				},
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].severity).toBe("info");
		});
	});

	describe("simple tools without examples", () => {
		it("should produce info for simple tools with brief descriptions", () => {
			const tool = makeTool({
				name: "get_user",
				description: "Retrieves a user profile by ID.",
				inputSchema: {
					type: "object",
					properties: {
						userId: { type: "string" },
					},
				},
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].severity).toBe("info");
		});

		it("should not flag simple tools with longer descriptions", () => {
			const tool = makeTool({
				name: "get_user",
				description:
					"Retrieves a user profile by their unique identifier from the users database. Returns the user's name, email address, and account status.",
				inputSchema: {
					type: "object",
					properties: {
						userId: { type: "string" },
					},
				},
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("diagnostics metadata", () => {
		it("should include correct ruleId and category", () => {
			const tool = makeTool({
				name: "my_tool",
				description: "Does something with the given input data.",
				inputSchema: {
					type: "object",
					properties: {
						a: { type: "string" },
						b: { type: "string" },
						c: { type: "string" },
					},
				},
			});
			const diags = ts005MissingExamples.check(tool);
			expect(diags.length).toBeGreaterThan(0);
			expect(diags[0].ruleId).toBe("TS005");
			expect(diags[0].category).toBe("missing-examples");
		});
	});
});
