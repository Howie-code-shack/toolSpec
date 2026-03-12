import type { Diagnostic, Rule, ToolDefinition } from "../types/index.js";

/**
 * Patterns that suggest an example is embedded in the description.
 */
const EXAMPLE_INDICATORS = [
	"example:",
	"example,",
	"examples:",
	"e.g.",
	"e.g.,",
	"for example",
	"for instance",
	"such as",
	"like:",
	'like "',
	"like '",
	"sample:",
	"usage:",
	"```",
	"=>",
	"→",
];

/**
 * Patterns in parameter schemas that indicate examples are provided there.
 */
function paramHasExamples(prop: Record<string, unknown>): boolean {
	// JSON Schema `examples` keyword
	if (Array.isArray(prop.examples) && prop.examples.length > 0) return true;
	// Single `default` value can serve as an implicit example
	if (prop.default !== undefined) return true;
	// Enum values effectively document the allowed examples
	if (Array.isArray(prop.enum) && prop.enum.length > 0) return true;
	return false;
}

/**
 * Check if the description contains example-like content.
 */
function hasExamplesInDescription(description: string): boolean {
	const lower = description.toLowerCase();
	return EXAMPLE_INDICATORS.some((indicator) => lower.includes(indicator));
}

/**
 * Heuristic: tools with complex schemas benefit more from examples.
 * Simple tools (0-2 params, all well-typed) need them less.
 */
function schemaComplexity(tool: ToolDefinition): "simple" | "moderate" | "complex" {
	const props = tool.inputSchema.properties ?? {};
	const count = Object.keys(props).length;

	if (count <= 2) return "simple";
	if (count <= 5) return "moderate";
	return "complex";
}

/**
 * TS005: Missing Examples
 *
 * Checks whether the tool provides usage examples — either in the description
 * text or via JSON Schema `examples`/`default`/`enum` keywords in the parameters.
 * More important for complex tools with many parameters.
 */
export const ts005MissingExamples: Rule = {
	meta: {
		id: "TS005",
		name: "missing-examples",
		description:
			"Tool descriptions should include usage examples, especially for complex tools. " +
			"Examples help the FM understand expected input patterns and output formats.",
		category: "missing-examples",
		defaultSeverity: "info",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS005",
			category: ts005MissingExamples.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		// Skip tools with no description — TS001 handles that
		if (!tool.description || tool.description.trim().length === 0) {
			return diagnostics;
		}

		const desc = tool.description.trim();
		const hasDescExamples = hasExamplesInDescription(desc);

		// Check if parameters provide examples via schema keywords
		const props = tool.inputSchema.properties ?? {};
		const paramNames = Object.keys(props);
		const paramsWithExamples = paramNames.filter((name) =>
			paramHasExamples(props[name] as Record<string, unknown>),
		);
		const hasSchemaExamples = paramsWithExamples.length > 0;

		// If examples exist in either place, we're good
		if (hasDescExamples || hasSchemaExamples) return diagnostics;

		const complexity = schemaComplexity(tool);

		if (complexity === "complex") {
			diagnostics.push({
				...base,
				severity: "warning",
				message: `Tool "${tool.name}" accepts ${paramNames.length} parameters but provides no usage examples. Complex tools are significantly harder for the FM to use correctly without examples.`,
				suggestion:
					'Add an example to the description (e.g. \'Example: {"query": "annual report", ' +
					'"limit": 10}\') or add `examples` to parameter schemas.',
			});
		} else if (complexity === "moderate") {
			diagnostics.push({
				...base,
				severity: "info",
				message: `Tool "${tool.name}" provides no usage examples. Adding examples helps the FM understand expected input patterns.`,
				suggestion:
					"Consider adding an example to the description or using the JSON Schema `examples` keyword.",
			});
		} else {
			// Simple tools — only flag if the description is also short
			if (desc.length < 80) {
				diagnostics.push({
					...base,
					severity: "info",
					message: `Tool "${tool.name}" has a brief description with no examples. An example could help clarify usage.`,
					suggestion:
						"Consider adding a brief example like 'e.g. query=\"annual report\"' to the description.",
				});
			}
		}

		return diagnostics;
	},
};
