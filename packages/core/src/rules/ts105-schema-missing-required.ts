import type { Diagnostic, JSONSchemaProperty, Rule, ToolDefinition } from "../types/index.js";

/**
 * Recursively find object schemas that have properties but no `required` array.
 */
function findMissingRequired(
	properties: Record<string, JSONSchemaProperty>,
	path: string,
): { path: string; name: string; propCount: number }[] {
	const found: { path: string; name: string; propCount: number }[] = [];

	for (const [name, prop] of Object.entries(properties)) {
		const fullPath = `${path}.${name}`;

		// Nested object with properties but no required array
		if (
			prop.type === "object" &&
			prop.properties &&
			Object.keys(prop.properties).length > 0 &&
			(!prop.required || prop.required.length === 0)
		) {
			found.push({
				path: fullPath,
				name,
				propCount: Object.keys(prop.properties).length,
			});
		}

		// Recurse into nested object properties
		if (prop.properties) {
			found.push(...findMissingRequired(prop.properties, fullPath));
		}

		// Recurse into array item schemas
		if (prop.items?.properties) {
			found.push(...findMissingRequired(prop.items.properties, `${fullPath}.items`));
		}
	}

	return found;
}

/**
 * TS105: Schema Missing Required
 *
 * Checks that the top-level inputSchema and any nested object schemas
 * declare a `required` array when they have properties. Without it,
 * the FM may omit essential parameters.
 */
export const ts105SchemaMissingRequired: Rule = {
	meta: {
		id: "TS105",
		name: "schema-missing-required",
		description:
			"Object schemas with properties should declare a required array. " +
			"Without it, the FM may omit essential parameters.",
		category: "schema-structural",
		defaultSeverity: "warning",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS105",
			category: ts105SchemaMissingRequired.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		// Check top-level inputSchema
		const topProperties = tool.inputSchema.properties;
		if (topProperties && Object.keys(topProperties).length > 0) {
			const topRequired = tool.inputSchema.required;
			if (!topRequired || topRequired.length === 0) {
				diagnostics.push({
					...base,
					severity: ts105SchemaMissingRequired.meta.defaultSeverity,
					message: `Tool "${tool.name}" inputSchema has ${Object.keys(topProperties).length} properties but no "required" array. The FM may omit essential parameters.`,
					suggestion: `Add a "required" array listing the parameters that must be provided. If all are optional, add "required": [] explicitly to signal intent.`,
				});
			}
		}

		// Check nested objects
		if (topProperties) {
			const nested = findMissingRequired(topProperties, "inputSchema.properties");
			for (const { path, name, propCount } of nested) {
				diagnostics.push({
					...base,
					severity: ts105SchemaMissingRequired.meta.defaultSeverity,
					message: `Nested object "${name}" at ${path} has ${propCount} properties but no "required" array.`,
					suggestion: `Add a "required" array to "${name}" listing which nested properties must be provided.`,
				});
			}
		}

		return diagnostics;
	},
};
