import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts102SchemaMissingDescription } from "../ts102-schema-missing-description.js";

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

describe("TS102: schema-missing-description", () => {
	describe("passing cases", () => {
		it("should pass when all properties have descriptions", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						userId: { type: "string", description: "The unique user identifier" },
						format: { type: "string", description: "Output format (json or csv)" },
					},
				},
			});
			const diags = ts102SchemaMissingDescription.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when inputSchema has no properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object" },
			});
			const diags = ts102SchemaMissingDescription.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("failing cases", () => {
		it("should flag a property with no description", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string" },
					},
				},
			});
			const diags = ts102SchemaMissingDescription.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].ruleId).toBe("TS102");
			expect(diags[0].severity).toBe("warning");
			expect(diags[0].message).toContain('"query"');
		});

		it("should flag a property with an empty description", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string", description: "  " },
					},
				},
			});
			const diags = ts102SchemaMissingDescription.check(tool);
			expect(diags).toHaveLength(1);
		});

		it("should flag multiple properties missing descriptions", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string" },
						limit: { type: "integer" },
						format: { type: "string", description: "Output format" },
					},
				},
			});
			const diags = ts102SchemaMissingDescription.check(tool);
			expect(diags).toHaveLength(2);
		});

		it("should flag nested properties missing descriptions", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						options: {
							type: "object",
							description: "Query options",
							properties: {
								sortBy: { type: "string" },
							},
						},
					},
				},
			});
			const diags = ts102SchemaMissingDescription.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"sortBy"');
		});

		it("should flag properties inside array items", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						filters: {
							type: "array",
							description: "List of filters to apply",
							items: {
								type: "object",
								properties: {
									field: { type: "string" },
									value: { type: "string" },
								},
							},
						},
					},
				},
			});
			const diags = ts102SchemaMissingDescription.check(tool);
			expect(diags).toHaveLength(2);
		});
	});

	describe("diagnostics metadata", () => {
		it("should include correct category and suggestion", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						data: { type: "string" },
					},
				},
			});
			const diags = ts102SchemaMissingDescription.check(tool);
			expect(diags[0].category).toBe("schema-structural");
			expect(diags[0].suggestion).toContain("description");
		});
	});
});
