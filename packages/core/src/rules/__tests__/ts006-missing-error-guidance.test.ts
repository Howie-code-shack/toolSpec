import { describe, expect, it } from "vitest";
import type { ToolDefinition } from "../../types/index.js";
import { ts006MissingErrorGuidance } from "../ts006-missing-error-guidance.js";

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

describe("TS006: missing-error-guidance", () => {
	describe("passing cases — both output and error documented", () => {
		it("should pass when description documents both returns and errors", () => {
			const tool = makeTool({
				name: "get_user",
				description:
					"Retrieves a user by ID. Returns a JSON object with name, email, and role fields. " +
					"Returns an error if the user ID does not exist.",
			});
			const diags = ts006MissingErrorGuidance.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should pass when description mentions output shape and failure", () => {
			const tool = makeTool({
				name: "search_docs",
				description:
					"Searches documents by keyword. Produces an array of matching results with " +
					"title and snippet. Returns empty result if no matches found.",
			});
			const diags = ts006MissingErrorGuidance.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should skip tools with no description (TS001 handles it)", () => {
			const tool = makeTool({ description: undefined });
			const diags = ts006MissingErrorGuidance.check(tool);
			expect(diags).toHaveLength(0);
		});

		it("should skip tools with very short descriptions (TS001 territory)", () => {
			const tool = makeTool({ description: "Gets a user." });
			const diags = ts006MissingErrorGuidance.check(tool);
			expect(diags).toHaveLength(0);
		});
	});

	describe("missing output documentation", () => {
		it("should flag when description has no mention of what it returns", () => {
			const tool = makeTool({
				name: "update_config",
				description:
					"Updates the configuration for the specified service with the new key-value pair.",
			});
			const diags = ts006MissingErrorGuidance.check(tool);
			const outputDiag = diags.find((d) => d.message.includes("does not explain what it returns"));
			expect(outputDiag).toBeDefined();
			expect(outputDiag?.severity).toBe("warning");
		});

		it("should not flag if outputSchema is provided", () => {
			const tool = makeTool({
				name: "get_count",
				description:
					"Counts the number of active records in the system. Throws an error if the database is unavailable.",
				outputSchema: {
					type: "object",
					properties: {
						count: { type: "number" },
					},
				},
			});
			const diags = ts006MissingErrorGuidance.check(tool);
			const outputDiag = diags.find((d) => d.message.includes("does not explain what it returns"));
			expect(outputDiag).toBeUndefined();
		});
	});

	describe("missing error documentation", () => {
		it("should flag when description has no mention of error behaviour", () => {
			const tool = makeTool({
				name: "get_user",
				description:
					"Retrieves a user by ID. Returns a JSON object with name, email, and role fields.",
			});
			const diags = ts006MissingErrorGuidance.check(tool);
			const errorDiag = diags.find((d) => d.message.includes("error or failure"));
			expect(errorDiag).toBeDefined();
			expect(errorDiag?.severity).toBe("info");
		});

		it("should pass when error conditions are mentioned", () => {
			const tool = makeTool({
				name: "get_user",
				description:
					"Retrieves a user by ID. Returns a JSON object. Fails with 404 if user not found.",
			});
			const diags = ts006MissingErrorGuidance.check(tool);
			const errorDiag = diags.find((d) => d.message.includes("error or failure"));
			expect(errorDiag).toBeUndefined();
		});
	});

	describe("both missing", () => {
		it("should produce two diagnostics when both output and error guidance missing", () => {
			const tool = makeTool({
				name: "do_something",
				description:
					"Performs the primary operation on the given resource and applies transformations.",
			});
			const diags = ts006MissingErrorGuidance.check(tool);
			expect(diags).toHaveLength(2);
			const outputDiag = diags.find((d) => d.message.includes("does not explain what it returns"));
			const errorDiag = diags.find((d) => d.message.includes("error or failure"));
			expect(outputDiag).toBeDefined();
			expect(errorDiag).toBeDefined();
		});
	});

	describe("diagnostics metadata", () => {
		it("should include correct ruleId and category", () => {
			const tool = makeTool({
				name: "my_tool",
				description:
					"Performs the primary operation on the given resource and applies transformations.",
			});
			const diags = ts006MissingErrorGuidance.check(tool);
			expect(diags.length).toBeGreaterThan(0);
			for (const diag of diags) {
				expect(diag.ruleId).toBe("TS006");
				expect(diag.category).toBe("missing-error-guidance");
			}
		});

		it("should include suggestions", () => {
			const tool = makeTool({
				name: "my_tool",
				description:
					"Performs the primary operation on the given resource and applies transformations.",
			});
			const diags = ts006MissingErrorGuidance.check(tool);
			for (const diag of diags) {
				expect(diag.suggestion).toBeDefined();
				expect(diag.suggestion?.length).toBeGreaterThan(0);
			}
		});
	});
});
