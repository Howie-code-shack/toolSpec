import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts103SchemaUnsupportedKeywords } from "../ts103-schema-unsupported-keywords.js";

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

describe("TS103: schema-unsupported-keywords", () => {
	describe("passing cases", () => {
		it("should pass a schema with no composition keywords", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string" },
						count: { type: "integer" },
					},
				},
			});
			const diags = ts103SchemaUnsupportedKeywords.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass a schema with no properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object" },
			});
			const diags = ts103SchemaUnsupportedKeywords.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("anyOf", () => {
		it("should flag anyOf on a property", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						value: {
							anyOf: [{ type: "string" }, { type: "number" }],
						},
					},
				},
			});
			const diags = ts103SchemaUnsupportedKeywords.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].ruleId).toBe("TS103");
			expect(diags[0].severity).toBe("error");
			expect(diags[0].message).toContain("anyOf");
			expect(diags[0].message).toContain("Azure AI Foundry");
		});

		it("should flag anyOf at the top level", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					anyOf: [
						{ properties: { name: { type: "string" } } },
						{ properties: { id: { type: "number" } } },
					],
					properties: {},
				},
			});
			const diags = ts103SchemaUnsupportedKeywords.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain("top level");
		});
	});

	describe("oneOf", () => {
		it("should flag oneOf on a property", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						format: {
							oneOf: [
								{ type: "string", enum: ["json"] },
								{ type: "string", enum: ["csv"] },
							],
						},
					},
				},
			});
			const diags = ts103SchemaUnsupportedKeywords.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain("oneOf");
		});
	});

	describe("allOf", () => {
		it("should flag allOf on a property", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						config: {
							allOf: [
								{ type: "object", properties: { a: { type: "string" } } },
								{ type: "object", properties: { b: { type: "string" } } },
							],
						},
					},
				},
			});
			const diags = ts103SchemaUnsupportedKeywords.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain("allOf");
		});
	});

	describe("nested schemas", () => {
		it("should flag composition keywords in nested objects", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						options: {
							type: "object",
							properties: {
								mode: {
									anyOf: [{ type: "string" }, { type: "number" }],
								},
							},
						},
					},
				},
			});
			const diags = ts103SchemaUnsupportedKeywords.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"mode"');
		});

		it("should flag composition keywords in array items", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						items: {
							type: "array",
							items: {
								oneOf: [{ type: "string" }, { type: "object" }],
							},
						},
					},
				},
			});
			const diags = ts103SchemaUnsupportedKeywords.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain("oneOf");
		});
	});

	describe("multiple violations", () => {
		it("should flag all composition keywords found", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						a: { anyOf: [{ type: "string" }] },
						b: { oneOf: [{ type: "number" }] },
					},
				},
			});
			const diags = ts103SchemaUnsupportedKeywords.check(tool);
			expect(diags).toHaveLength(2);
		});
	});

	describe("diagnostics metadata", () => {
		it("should include suggestions", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						value: { anyOf: [{ type: "string" }] },
					},
				},
			});
			const diags = ts103SchemaUnsupportedKeywords.check(tool);
			expect(diags[0].suggestion).toBeDefined();
			expect(diags[0].category).toBe("schema-structural");
		});
	});
});
