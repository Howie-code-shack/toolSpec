import type { Diagnostic, Rule, ToolDefinition } from "../types/index.js";

/**
 * Parameter names that are considered universally clear without a description.
 * These are so common that an LLM will understand them without extra context.
 */
const WELL_KNOWN_PARAMS = new Set([
	"id",
	"name",
	"email",
	"url",
	"path",
	"query",
	"message",
	"title",
	"body",
	"description",
	"content",
	"text",
	"type",
	"format",
	"status",
	"enabled",
	"verbose",
	"dryrun",
	"dry_run",
	"force",
]);

/**
 * Single-letter or extremely short names that are almost always opaque.
 */
const MIN_PARAM_NAME_LENGTH = 2;

/**
 * Patterns that suggest a parameter name is an abbreviation or acronym
 * that probably needs a description.
 */
const ABBREVIATION_PATTERNS = [
	/^[a-z]{1,3}$/, // 1-3 lowercase letters (e.g. "q", "cb", "src")
	/^[A-Z]{2,}$/, // All-caps acronym (e.g. "URL" is fine — handled by well-known check)
	/^[a-z]+[A-Z][a-z]*$/, // camelCase abbreviation like "maxRt", "dbId"
];

/**
 * Check if a parameter name is likely clear on its own.
 */
function isNameSelfDescriptive(name: string): boolean {
	const lower = name.toLowerCase().replace(/[_-]/g, "");
	if (WELL_KNOWN_PARAMS.has(lower)) return true;

	// Also check the original name (for camelCase well-known names)
	if (WELL_KNOWN_PARAMS.has(name.toLowerCase())) return true;

	// Names with multiple words (camelCase or snake_case) are more descriptive
	const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[_\- ]+/);
	if (words.length >= 2 && words.every((w) => w.length >= 3)) return true;

	return false;
}

/**
 * Check if a parameter name looks like a terse abbreviation.
 */
function isAbbreviation(name: string): boolean {
	return ABBREVIATION_PATTERNS.some((pattern) => pattern.test(name));
}

/**
 * TS004: Opaque Parameters
 *
 * Checks that tool parameters have clear names and descriptions.
 * Flags parameters with:
 * - Missing descriptions (unless the name is self-descriptive)
 * - Very short or abbreviated names without descriptions
 * - Names that are single characters
 */
export const ts004OpaqueParameters: Rule = {
	meta: {
		id: "TS004",
		name: "opaque-parameters",
		description:
			"All tool parameters should have clear, descriptive names and descriptions. " +
			"Opaque parameter names like 'q' or 'cb' without descriptions leave the FM guessing.",
		category: "opaque-parameters",
		defaultSeverity: "error",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS004",
			category: ts004OpaqueParameters.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		const properties = tool.inputSchema.properties ?? {};
		const paramNames = Object.keys(properties);

		// No parameters — nothing to check
		if (paramNames.length === 0) return diagnostics;

		for (const paramName of paramNames) {
			const prop = properties[paramName];
			const hasDescription = Boolean(prop.description && prop.description.trim().length > 0);
			const selfDescriptive = isNameSelfDescriptive(paramName);

			// Single-character names are always opaque
			if (paramName.length < MIN_PARAM_NAME_LENGTH) {
				diagnostics.push({
					...base,
					severity: "error",
					message: `Parameter "${paramName}" on tool "${tool.name}" has a single-character name. This is opaque to an FM — it cannot infer what value to provide.`,
					suggestion: `Rename "${paramName}" to a descriptive name (e.g. "query", "count", "userId") and add a description.`,
				});
				continue;
			}

			// Abbreviated name without description (skip well-known names)
			if (!selfDescriptive && isAbbreviation(paramName) && !hasDescription) {
				diagnostics.push({
					...base,
					severity: "error",
					message: `Parameter "${paramName}" on tool "${tool.name}" appears to be an abbreviation and has no description. The FM cannot determine what value to provide.`,
					suggestion: `Either rename "${paramName}" to a full word (e.g. "${paramName}" → ?) or add a description explaining what this parameter represents.`,
				});
				continue;
			}

			// Non-self-descriptive name without description
			if (!selfDescriptive && !hasDescription) {
				diagnostics.push({
					...base,
					severity: "warning",
					message: `Parameter "${paramName}" on tool "${tool.name}" has no description. While the name is not an obvious abbreviation, a description would help the FM understand what value to provide.`,
					suggestion: `Add a description to "${paramName}" explaining its purpose, expected format, and any constraints (e.g. valid ranges, allowed values).`,
				});
			}
		}

		return diagnostics;
	},
};
