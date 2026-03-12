import type { Diagnostic, JSONSchemaProperty, Rule, ToolDefinition } from "../types/index.js";

/**
 * Recursively find overly permissive type declarations.
 */
function findPermissiveTypes(
	properties: Record<string, JSONSchemaProperty>,
	path: string,
): { path: string; name: string; reason: string }[] {
	const found: { path: string; name: string; reason: string }[] = [];

	for (const [name, prop] of Object.entries(properties)) {
		const fullPath = `${path}.${name}`;

		// Bare "object" with no properties defined
		if (
			prop.type === "object" &&
			(!prop.properties || Object.keys(prop.properties).length === 0) &&
			prop.additionalProperties !== false
		) {
			found.push({
				path: fullPath,
				name,
				reason: 'type "object" with no properties defined — accepts any shape',
			});
		}

		// Bare "array" with no items schema
		if (prop.type === "array" && !prop.items) {
			found.push({
				path: fullPath,
				name,
				reason: 'type "array" with no items schema — accepts any element type',
			});
		}

		// Recurse into nested object properties
		if (prop.properties) {
			found.push(...findPermissiveTypes(prop.properties, fullPath));
		}

		// Recurse into array item properties
		if (prop.items?.properties) {
			found.push(...findPermissiveTypes(prop.items.properties, `${fullPath}.items`));
		}
	}

	return found;
}

/**
 * TS104: Schema Permissive Types
 *
 * Flags overly broad type declarations that give the FM no guidance
 * on what shape of data to provide. Catches bare "object" with no
 * properties and bare "array" with no items schema.
 */
export const ts104SchemaPermissiveTypes: Rule = {
	meta: {
		id: "TS104",
		name: "schema-permissive-types",
		description:
			"Flags overly permissive types like bare objects or untyped arrays " +
			"that give the FM no guidance on expected data shape.",
		category: "schema-structural",
		defaultSeverity: "warning",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS104",
			category: ts104SchemaPermissiveTypes.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		const properties = tool.inputSchema.properties;
		if (!properties) return diagnostics;

		const found = findPermissiveTypes(properties, "inputSchema.properties");

		for (const { path, name, reason } of found) {
			diagnostics.push({
				...base,
				severity: ts104SchemaPermissiveTypes.meta.defaultSeverity,
				message: `Property "${name}" at ${path} has a permissive type: ${reason}. The FM cannot determine what data structure to provide.`,
				suggestion: `Define the expected shape. For objects, add "properties" with typed fields. For arrays, add an "items" schema describing the element type.`,
			});
		}

		return diagnostics;
	},
};
