import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts105SchemaMissingRequired } from "../ts105-schema-missing-required.js";

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

describe("TS105: schema-missing-required", () => {
	describe("passing cases", () => {
		it("should pass when top-level required array is present", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						userId: { type: "string" },
						format: { type: "string" },
					},
					required: ["userId"],
				},
			});
			const diags = ts105SchemaMissingRequired.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when schema has no properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object" },
			});
			const diags = ts105SchemaMissingRequired.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass nested object with required array", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						config: {
							type: "object",
							properties: {
								key: { type: "string" },
								value: { type: "string" },
							},
							required: ["key"],
						},
					},
					required: ["config"],
				},
			});
			const diags = ts105SchemaMissingRequired.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("top-level missing required", () => {
		it("should flag when top-level schema has properties but no required", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string" },
						limit: { type: "integer" },
					},
				},
			});
			const diags = ts105SchemaMissingRequired.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].ruleId).toBe("TS105");
			expect(diags[0].severity).toBe("warning");
			expect(diags[0].message).toContain("2 properties");
			expect(diags[0].message).toContain('no "required"');
		});

		it("should flag when required is an empty array", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string" },
					},
					required: [],
				},
			});
			const diags = ts105SchemaMissingRequired.check(tool);
			expect(diags).toHaveLength(1);
		});
	});

	describe("nested missing required", () => {
		it("should flag nested object with properties but no required", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						options: {
							type: "object",
							properties: {
								format: { type: "string" },
								verbose: { type: "boolean" },
							},
						},
					},
					required: ["options"],
				},
			});
			const diags = ts105SchemaMissingRequired.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"options"');
			expect(diags[0].message).toContain("2 properties");
		});
	});

	describe("multiple violations", () => {
		it("should flag both top-level and nested missing required", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string" },
						options: {
							type: "object",
							properties: {
								limit: { type: "integer" },
							},
						},
					},
				},
			});
			const diags = ts105SchemaMissingRequired.check(tool);
			expect(diags).toHaveLength(2);
		});
	});

	describe("diagnostics metadata", () => {
		it("should include suggestions and correct category", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						id: { type: "string" },
					},
				},
			});
			const diags = ts105SchemaMissingRequired.check(tool);
			expect(diags[0].suggestion).toContain("required");
			expect(diags[0].category).toBe("schema-structural");
		});
	});
});
