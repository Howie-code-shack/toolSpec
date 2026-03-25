import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts203CompatRequiredAll } from "../ts203-compat-required-all.js";

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

describe("TS203: compat-required-all", () => {
	describe("passing cases", () => {
		it("should pass when all properties are required", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string" },
						age: { type: "number" },
					},
					required: ["name", "age"],
				},
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when schema has no properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object" },
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when schema has empty properties", () => {
			const tool = makeTool({
				inputSchema: { type: "object", properties: {} },
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when nested objects also have all properties required", () => {
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
							required: ["key", "value"],
						},
					},
					required: ["config"],
				},
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("top-level violations", () => {
		it("should flag properties not in the required array", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string" },
						age: { type: "number" },
					},
					required: ["name"],
				},
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].ruleId).toBe("TS203");
			expect(diags[0].severity).toBe("warning");
			expect(diags[0].message).toContain('"age"');
		});

		it("should flag when required array is missing entirely", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string" },
					},
				},
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"query"');
		});

		it("should list multiple unrequired properties", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						a: { type: "string" },
						b: { type: "string" },
						c: { type: "string" },
					},
					required: ["a"],
				},
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"b"');
			expect(diags[0].message).toContain('"c"');
			expect(diags[0].message).toContain("Properties");
		});
	});

	describe("nested violations", () => {
		it("should flag unrequired properties in nested objects", () => {
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
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"value"');
		});

		it("should flag unrequired properties in array item objects", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						items: {
							type: "array",
							items: {
								type: "object",
								properties: {
									id: { type: "string" },
									label: { type: "string" },
								},
								required: ["id"],
							},
						},
					},
					required: ["items"],
				},
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('"label"');
		});
	});

	describe("singular vs plural messaging", () => {
		it("should use singular form for one unrequired property", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string" },
					},
				},
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags[0].message).toContain("Property");
			expect(diags[0].message).toContain("is not");
		});

		it("should use plural form for multiple unrequired properties", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						a: { type: "string" },
						b: { type: "string" },
					},
				},
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags[0].message).toContain("Properties");
			expect(diags[0].message).toContain("are not");
		});
	});

	describe("diagnostics metadata", () => {
		it("should include correct category and suggestion", () => {
			const tool = makeTool({
				inputSchema: {
					type: "object",
					properties: {
						name: { type: "string" },
					},
				},
			});
			const diags = ts203CompatRequiredAll.check(tool);
			expect(diags[0].category).toBe("client-compat");
			expect(diags[0].suggestion).toBeDefined();
			expect(diags[0].suggestion).toContain("required");
			expect(diags[0].suggestion).toContain("nullable");
		});
	});
});
