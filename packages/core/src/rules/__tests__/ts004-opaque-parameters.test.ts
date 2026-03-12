import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts004OpaqueParameters } from "../ts004-opaque-parameters.js";

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

describe("TS004: opaque-parameters", () => {
	describe("passing cases", () => {
		it("should pass well-described parameters", () => {
			const tool = makeTool({
				name: "search_docs",
				inputSchema: {
					type: "object",
					properties: {
						query: { type: "string", description: "The search query string" },
						limit: { type: "integer", description: "Maximum results to return" },
					},
				},
			});
			const diags = ts004OpaqueParameters.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass well-known parameter names without descriptions", () => {
			const tool = makeTool({
				name: "get_user",
				inputSchema: {
					type: "object",
					properties: {
						id: { type: "string" },
						name: { type: "string" },
						email: { type: "string" },
					},
				},
			});
			const diags = ts004OpaqueParameters.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass multi-word parameter names without descriptions", () => {
			const tool = makeTool({
				name: "create_ticket",
				inputSchema: {
					type: "object",
					properties: {
						projectName: { type: "string" },
						assignedUser: { type: "string" },
					},
				},
			});
			const diags = ts004OpaqueParameters.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass tools with no parameters", () => {
			const tool = makeTool({
				name: "ping",
				inputSchema: { type: "object" },
			});
			const diags = ts004OpaqueParameters.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("single-character names", () => {
		it("should flag single-character parameter names", () => {
			const tool = makeTool({
				name: "search",
				inputSchema: {
					type: "object",
					properties: {
						q: { type: "string" },
					},
				},
			});
			const diags = ts004OpaqueParameters.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].severity).toBe("error");
			expect(diags[0].message).toContain("single-character");
			expect(diags[0].message).toContain('"q"');
		});
	});

	describe("abbreviated names without descriptions", () => {
		it("should flag short abbreviated names", () => {
			const tool = makeTool({
				name: "fetch_data",
				inputSchema: {
					type: "object",
					properties: {
						cb: { type: "string" },
						src: { type: "string" },
					},
				},
			});
			const diags = ts004OpaqueParameters.check(tool);
			expect(diags).toHaveLength(2);
			expect(diags.every((d) => d.severity === "error")).toBe(true);
		});

		it("should not flag abbreviated names that have descriptions", () => {
			const tool = makeTool({
				name: "fetch_data",
				inputSchema: {
					type: "object",
					properties: {
						cb: { type: "string", description: "Callback URL for async results" },
					},
				},
			});
			const diags = ts004OpaqueParameters.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("non-obvious names without descriptions", () => {
		it("should warn about non-obvious names missing descriptions", () => {
			const tool = makeTool({
				name: "update_config",
				inputSchema: {
					type: "object",
					properties: {
						value: { type: "string" },
					},
				},
			});
			const diags = ts004OpaqueParameters.check(tool);
			expect(diags).toHaveLength(1);
			expect(diags[0].severity).toBe("warning");
			expect(diags[0].message).toContain("no description");
		});
	});

	describe("diagnostics metadata", () => {
		it("should include correct ruleId and category", () => {
			const tool = makeTool({
				name: "my_tool",
				inputSchema: {
					type: "object",
					properties: {
						x: { type: "string" },
					},
				},
			});
			const diags = ts004OpaqueParameters.check(tool);
			expect(diags[0].ruleId).toBe("TS004");
			expect(diags[0].category).toBe("opaque-parameters");
		});

		it("should include suggestions for every diagnostic", () => {
			const tool = makeTool({
				name: "my_tool",
				inputSchema: {
					type: "object",
					properties: {
						q: { type: "string" },
						cb: { type: "string" },
					},
				},
			});
			const diags = ts004OpaqueParameters.check(tool);
			for (const diag of diags) {
				expect(diag.suggestion).toBeDefined();
				expect(diag.suggestion?.length).toBeGreaterThan(0);
			}
		});
	});
});
