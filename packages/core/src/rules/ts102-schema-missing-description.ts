import type { Diagnostic, JSONSchemaProperty, Rule, ToolDefinition } from "../types/index.js";

/**
 * Recursively find properties missing a `description`.
 * Returns array of { path, name } objects.
 */
function findMissingDescriptions(
	properties: Record<string, JSONSchemaProperty>,
	path: string,
): { path: string; name: string }[] {
	const missing: { path: string; name: string }[] = [];

	for (const [name, prop] of Object.entries(properties)) {
		const fullPath = `${path}.${name}`;

		const hasDescription =
			typeof prop.description === "string" && prop.description.trim().length > 0;

		if (!hasDescription) {
			missing.push({ path: fullPath, name });
		}

		// Recurse into nested object properties
		if (prop.properties) {
			missing.push(...findMissingDescriptions(prop.properties, fullPath));
		}

		// Recurse into array item schemas
		if (prop.items?.properties) {
			missing.push(...findMissingDescriptions(prop.items.properties, `${fullPath}.items`));
		}
	}

	return missing;
}

/**
 * TS102: Schema Missing Description
 *
 * Checks that every property in the inputSchema has a description.
 * Without descriptions, the FM has to guess what values to provide
 * based solely on the property name.
 */
export const ts102SchemaMissingDescription: Rule = {
	meta: {
		id: "TS102",
		name: "schema-missing-description",
		description:
			"Every property in inputSchema should have a description to help " +
			"the FM understand what value to provide.",
		category: "schema-structural",
		defaultSeverity: "warning",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS102",
			category: ts102SchemaMissingDescription.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		const properties = tool.inputSchema.properties;
		if (!properties) return diagnostics;

		const missing = findMissingDescriptions(properties, "inputSchema.properties");

		for (const { path, name } of missing) {
			diagnostics.push({
				...base,
				severity: ts102SchemaMissingDescription.meta.defaultSeverity,
				message: `Property "${name}" at ${path} has no description. The FM must guess what value to provide based on the name alone.`,
				suggestion: `Add a "description" field explaining what this property represents, its expected format, and any constraints.`,
			});
		}

		return diagnostics;
	},
};
