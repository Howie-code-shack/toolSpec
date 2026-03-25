import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts202CompatRefUsage } from "../ts202-compat-ref-usage.js";

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

describe("TS202: compat-ref-usage", () => {
	describe("passing cases", () => {
		it("should pass a schema with no $ref", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string" },
						count: { type: "integer" },
					},
				},
			});
			const diags = ts202CompatRefUsage.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass a schema with no properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object" },
			});
			const diags = ts202CompatRefUsage.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass empty properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object", properties: {} },
			});
			const diags = ts202CompatRefUsage.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("property-level $ref", () => {
		it("should flag a property using $ref", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						config: { $ref: "#/definitions/Config" },
					},
				},
			});
			const diags = ts202CompatRefUsage.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].ruleId).toBe("TS202");
			expect(diags[0].severity).toBe("warning");
			expect(diags[0].message).toContain("$ref");
			expect(diags[0].message).toContain("#/definitions/Config");
		});
	});

	describe("top-level $ref", () => {
		it("should flag top-level inputSchema $ref", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					$ref: "#/definitions/InputSchema",
				},
			});
			const diags = ts202CompatRefUsage.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain("top level");
		});
	});

	describe("nested $ref", () => {
		it("should flag $ref in nested object properties", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						options: {
							type: "object",
							properties: {
								format: { $ref: "#/definitions/Format" },
							},
						},
					},
				},
			});
			const diags = ts202CompatRefUsage.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"format"');
			expect(diags[0].message).toContain("#/definitions/Format");
		});

		it("should flag $ref in array items", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						items: {
							type: "array",
							items: { $ref: "#/definitions/Item" },
						},
					},
				},
			});
			const diags = ts202CompatRefUsage.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain("items");
			expect(diags[0].message).toContain("#/definitions/Item");
		});

		it("should flag $ref inside composition keywords", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						value: {
							anyOf: [
								{ $ref: "#/definitions/StringVal" },
								{ type: "number" },
							],
						},
					},
				},
			});
			const diags = ts202CompatRefUsage.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain("$ref");
			expect(diags[0].message).toContain("#/definitions/StringVal");
		});
	});

	describe("multiple violations", () => {
		it("should flag all $ref usages", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						a: { $ref: "#/definitions/A" },
						b: { $ref: "#/definitions/B" },
						c: { type: "string" },
					},
				},
			});
			const diags = ts202CompatRefUsage.check(tool);
			expect(diags).toHaveLength(2);
		});
	});

	describe("diagnostics metadata", () => {
		it("should include correct category and suggestion", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						config: { $ref: "#/definitions/Config" },
					},
				},
			});
			const diags = ts202CompatRefUsage.check(tool);
			expect(diags[0].category).toBe("client-compat");
			expect(diags[0].suggestion).toBeDefined();
			expect(diags[0].suggestion).toContain("inline");
		});
	});
});
