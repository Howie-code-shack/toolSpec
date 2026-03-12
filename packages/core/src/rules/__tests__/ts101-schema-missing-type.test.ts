import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts101SchemaMissingType } from "../ts101-schema-missing-type.js";

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

describe("TS101: schema-missing-type", () => {
	describe("passing cases", () => {
		it("should pass when all properties have types", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string" },
						age: { type: "number" },
						active: { type: "boolean" },
					},
				},
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when property uses enum instead of type", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						status: { enum: ["active", "inactive", "archived"] },
					},
				},
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when property uses anyOf (type via composition)", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						value: { anyOf: [{ type: "string" }, { type: "number" }] },
					},
				},
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when property uses $ref", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						config: { $ref: "#/definitions/Config" },
					},
				},
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when inputSchema has no properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object" },
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("failing cases", () => {
		it("should flag a property with no type", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						value: { description: "The new value to set" },
					},
				},
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].ruleId).toBe("TS101");
			expect(diags[0].severity).toBe("error");
			expect(diags[0].message).toContain('"value"');
		});

		it("should flag multiple properties missing types", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string" },
						config: { description: "Configuration object" },
						data: {},
					},
				},
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags).toHaveLength(2);
			const names = diags.map((d) => d.message);
			expect(names.some((m) => m.includes('"config"'))).toBe(true);
			expect(names.some((m) => m.includes('"data"'))).toBe(true);
		});

		it("should flag nested properties missing types", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						options: {
							type: "object",
							properties: {
								format: {},
							},
						},
					},
				},
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"format"');
			expect(diags[0].message).toContain("inputSchema.properties.options");
		});

		it("should flag properties in array items missing types", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						items: {
							type: "array",
							items: {
								type: "object",
								properties: {
									label: {},
								},
							},
						},
					},
				},
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"label"');
		});
	});

	describe("diagnostics metadata", () => {
		it("should include suggestions", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						data: {},
					},
				},
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags[0].suggestion).toBeDefined();
			expect(diags[0].suggestion).toContain("type");
		});

		it("should include correct category", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						data: {},
					},
				},
			});
			const diags = ts101SchemaMissingType.check(tool);
			expect(diags[0].category).toBe("schema-structural");
		});
	});
});
