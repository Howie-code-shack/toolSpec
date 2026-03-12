import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts002UnstatedLimitations } from "../ts002-unstated-limitations.js";

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

describe("TS002: unstated-limitations", () => {
	describe("passing cases", () => {
		it("should pass when description mentions rate limits", () => {
			const tool = makeTool({
				name: "search_api",
				description:
					"Searches the external API for matching records. Rate limited to 100 requests per minute. Returns a paginated list.",
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string", description: "Search query" },
						maxResults: { type: "integer", description: "Max results to return (1-100)" },
					},
				},
			});
			const diags = ts002UnstatedLimitations.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when description mentions error conditions", () => {
			const tool = makeTool({
				name: "get_file",
				description:
					"Downloads a file by ID. Returns an error if the file does not exist or the user lacks permission.",
				inputSchema: {
					type: "object",
					properties: {
						limit: { type: "integer", description: "Max file size in bytes" },
					},
				},
			});
			const diags = ts002UnstatedLimitations.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when no constraint-suggesting params exist", () => {
			const tool = makeTool({
				name: "get_user",
				description: "Retrieves a user profile by ID from the database.",
				inputSchema: {
					type: "object",
					properties: {
						userId: { type: "string", description: "The user ID" },
					},
				},
			});
			const diags = ts002UnstatedLimitations.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should skip tools with no description (TS001 handles it)", () => {
			const tool = makeTool({ description: undefined });
			const diags = ts002UnstatedLimitations.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("constraint-suggesting parameters without limitation language", () => {
		it("should flag when 'maxResults' param exists but no limitations mentioned", () => {
			const tool = makeTool({
				name: "list_items",
				description: "Lists items from the inventory database.",
				inputSchema: {
					type: "object",
					properties: {
						maxResults: { type: "integer" },
						category: { type: "string" },
					},
				},
			});
			const diags = ts002UnstatedLimitations.check(tool);
			expect(diags.length).toBeGreaterThan(0);
			const constraintDiag = diags.find((d) => d.message.includes("maxResults"));
			expect(constraintDiag).toBeDefined();
			expect(constraintDiag?.ruleId).toBe("TS002");
		});

		it("should flag when 'timeout' param exists but no limitations mentioned", () => {
			const tool = makeTool({
				name: "run_query",
				description: "Runs a database query and returns results.",
				inputSchema: {
					type: "object",
					properties: {
						sql: { type: "string" },
						timeout: { type: "integer" },
					},
				},
			});
			const diags = ts002UnstatedLimitations.check(tool);
			const constraintDiag = diags.find((d) => d.message.includes("timeout"));
			expect(constraintDiag).toBeDefined();
		});

		it("should flag when 'limit' and 'offset' params exist", () => {
			const tool = makeTool({
				name: "search_records",
				description: "Searches records in the system.",
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string" },
						limit: { type: "integer" },
						offset: { type: "integer" },
					},
				},
			});
			const diags = ts002UnstatedLimitations.check(tool);
			const constraintDiag = diags.find((d) => d.message.includes("limit"));
			expect(constraintDiag).toBeDefined();
		});
	});

	describe("complex tools without limitations", () => {
		it("should flag tools with 5+ params and no limitation language", () => {
			const tool = makeTool({
				name: "create_report",
				description: "Creates a new analytical report from the data warehouse.",
				inputSchema: {
					type: "object",
					properties: {
						title: { type: "string" },
						startDate: { type: "string" },
						endDate: { type: "string" },
						format: { type: "string" },
						recipients: { type: "string" },
					},
				},
			});
			const diags = ts002UnstatedLimitations.check(tool);
			const complexDiag = diags.find((d) => d.message.includes("5 parameters"));
			expect(complexDiag).toBeDefined();
			expect(complexDiag?.severity).toBe("info");
		});

		it("should not flag complex tools that document limitations", () => {
			const tool = makeTool({
				name: "create_report",
				description:
					"Creates a new analytical report. Limited to 30-day date ranges. Must be authenticated. " +
					"Returns an error if the format is unsupported.",
				inputSchema: {
					type: "object",
					properties: {
						title: { type: "string" },
						startDate: { type: "string" },
						endDate: { type: "string" },
						format: { type: "string" },
						recipients: { type: "string" },
					},
				},
			});
			const diags = ts002UnstatedLimitations.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("diagnostics metadata", () => {
		it("should include correct ruleId and category", () => {
			const tool = makeTool({
				name: "fetch_data",
				description: "Fetches data from the API.",
				inputSchema: {
					type: "object",
					properties: {
						maxItems: { type: "integer" },
					},
				},
			});
			const diags = ts002UnstatedLimitations.check(tool);
			expect(diags.length).toBeGreaterThan(0);
			expect(diags[0].ruleId).toBe("TS002");
			expect(diags[0].category).toBe("unstated-limitations");
		});

		it("should include suggestions", () => {
			const tool = makeTool({
				name: "fetch_data",
				description: "Fetches data from the API.",
				inputSchema: {
					type: "object",
					properties: {
						limit: { type: "integer" },
					},
				},
			});
			const diags = ts002UnstatedLimitations.check(tool);
			for (const diag of diags) {
				expect(diag.suggestion).toBeDefined();
				expect(diag.suggestion?.length).toBeGreaterThan(0);
			}
		});
	});
});
