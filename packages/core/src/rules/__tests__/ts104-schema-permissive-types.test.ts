import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts104SchemaPermissiveTypes } from "../ts104-schema-permissive-types.js";

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

describe("TS104: schema-permissive-types", () => {
	describe("passing cases", () => {
		it("should pass well-typed properties", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string" },
						count: { type: "integer" },
						tags: { type: "array", items: { type: "string" } },
					},
				},
			});
			const diags = ts104SchemaPermissiveTypes.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass object with defined properties", () => {
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
						},
					},
				},
			});
			const diags = ts104SchemaPermissiveTypes.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass object with additionalProperties: false (closed schema)", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						metadata: {
							type: "object",
							additionalProperties: false,
						},
					},
				},
			});
			const diags = ts104SchemaPermissiveTypes.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass schema with no properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object" },
			});
			const diags = ts104SchemaPermissiveTypes.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("bare object", () => {
		it("should flag a bare object with no properties", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						data: { type: "object" },
					},
				},
			});
			const diags = ts104SchemaPermissiveTypes.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].ruleId).toBe("TS104");
			expect(diags[0].severity).toBe("warning");
			expect(diags[0].message).toContain('"data"');
			expect(diags[0].message).toContain("no properties defined");
		});

		it("should flag an object with empty properties", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						options: { type: "object", properties: {} },
					},
				},
			});
			const diags = ts104SchemaPermissiveTypes.check(tool);
			expect(diags).toHaveLength(1);
		});
	});

	describe("bare array", () => {
		it("should flag an array with no items schema", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						values: { type: "array" },
					},
				},
			});
			const diags = ts104SchemaPermissiveTypes.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"values"');
			expect(diags[0].message).toContain("no items schema");
		});
	});

	describe("nested permissive types", () => {
		it("should flag permissive types inside nested objects", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						outer: {
							type: "object",
							properties: {
								inner: { type: "object" },
							},
						},
					},
				},
			});
			const diags = ts104SchemaPermissiveTypes.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"inner"');
		});
	});

	describe("multiple violations", () => {
		it("should flag all permissive properties", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						payload: { type: "object" },
						tags: { type: "array" },
					},
				},
			});
			const diags = ts104SchemaPermissiveTypes.check(tool);
			expect(diags).toHaveLength(2);
		});
	});

	describe("diagnostics metadata", () => {
		it("should include suggestions and correct category", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						data: { type: "object" },
					},
				},
			});
			const diags = ts104SchemaPermissiveTypes.check(tool);
			expect(diags[0].suggestion).toContain("properties");
			expect(diags[0].category).toBe("schema-structural");
		});
	});
});
