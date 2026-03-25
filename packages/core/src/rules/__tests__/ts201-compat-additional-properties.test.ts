import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts201CompatAdditionalProperties } from "../ts201-compat-additional-properties.js";

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

describe("TS201: compat-additional-properties", () => {
	describe("passing cases", () => {
		it("should pass when top-level schema has additionalProperties: false", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: { name: { type: "string" } },
					additionalProperties: false,
				},
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when schema has no properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object" },
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when schema has empty properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object", properties: {} },
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when nested objects also have additionalProperties: false", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						config: {
							type: "object",
							properties: { key: { type: "string" } },
							additionalProperties: false,
						},
					},
					additionalProperties: false,
				},
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("top-level violations", () => {
		it("should flag top-level schema missing additionalProperties: false", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: { name: { type: "string" } },
				},
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			expect(diags.some((d) => d.message.includes("inputSchema"))).toBe(true);
			expect(diags[0].ruleId).toBe("TS201");
			expect(diags[0].severity).toBe("warning");
		});

		it("should flag when additionalProperties is true", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: { name: { type: "string" } },
					additionalProperties: true,
				},
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			expect(diags.some((d) => d.message.includes("inputSchema"))).toBe(true);
		});
	});

	describe("nested violations", () => {
		it("should flag nested object missing additionalProperties: false", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						options: {
							type: "object",
							properties: { mode: { type: "string" } },
						},
					},
					additionalProperties: false,
				},
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"options"');
		});

		it("should flag object inside array items", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						items: {
							type: "array",
							items: {
								type: "object",
								properties: { label: { type: "string" } },
							},
						},
					},
					additionalProperties: false,
				},
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain("items");
		});

		it("should flag deeply nested objects", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						level1: {
							type: "object",
							properties: {
								level2: {
									type: "object",
									properties: { value: { type: "string" } },
								},
							},
							additionalProperties: false,
						},
					},
					additionalProperties: false,
				},
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"level2"');
		});
	});

	describe("multiple violations", () => {
		it("should flag all objects missing additionalProperties: false", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						a: {
							type: "object",
							properties: { x: { type: "string" } },
						},
						b: {
							type: "object",
							properties: { y: { type: "number" } },
						},
					},
				},
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			// top-level + a + b = 3
			expect(diags).toHaveLength(3);
		});
	});

	describe("diagnostics metadata", () => {
		it("should include correct category and suggestion", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: { name: { type: "string" } },
				},
			});
			const diags = ts201CompatAdditionalProperties.check(tool);
			expect(diags[0].category).toBe("client-compat");
			expect(diags[0].suggestion).toBeDefined();
			expect(diags[0].suggestion).toContain("additionalProperties");
		});
	});
});
