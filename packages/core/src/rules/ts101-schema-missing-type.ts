import type { Diagnostic, JSONSchemaProperty, Rule, ToolDefinition } from "../types/index.js";

/**
 * Recursively find properties that are missing a `type` declaration.
 * Returns an array of dot-path strings (e.g. "inputSchema.properties.config.properties.value").
 */
function findMissingTypes(properties: Record<string, JSONSchemaProperty>, path: string): string[] {
	const missing: string[] = [];

	for (const [name, prop] of Object.entries(properties)) {
		const fullPath = `${path}.${name}`;

		// A property has a type if it declares `type`, uses `enum`, or uses composition keywords
		const hasType = prop.type !== undefined;
		const hasEnum = Array.isArray(prop.enum) && prop.enum.length > 0;
		const hasComposition =
			Array.isArray(prop.anyOf) || Array.isArray(prop.oneOf) || Array.isArray(prop.allOf);
		const hasRef = prop.$ref !== undefined;
		const hasConst = "const" in prop;

		if (!hasType && !hasEnum && !hasComposition && !hasRef && !hasConst) {
			missing.push(fullPath);
		}

		// Recurse into nested object properties
		if (prop.properties) {
			missing.push(...findMissingTypes(prop.properties, fullPath));
		}

		// Recurse into array item schemas
		if (prop.items?.properties) {
			missing.push(...findMissingTypes(prop.items.properties, `${fullPath}.items`));
		}
	}

	return missing;
}

/**
 * TS101: Schema Missing Type
 *
 * Checks that every property in the inputSchema declares a `type`.
 * Properties without types break Azure AI Foundry, OpenAI strict mode,
 * and many other clients that require explicit typing.
 */
export const ts101SchemaMissingType: Rule = {
	meta: {
		id: "TS101",
		name: "schema-missing-type",
		description:
			"Every property in inputSchema must declare a type. " +
			"Missing types break Azure AI Foundry, OpenAI strict mode, and other clients.",
		category: "schema-structural",
		defaultSeverity: "error",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS101",
			category: ts101SchemaMissingType.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		const properties = tool.inputSchema.properties;
		if (!properties) return diagnostics;

		const missingPaths = findMissingTypes(properties, "inputSchema.properties");

		for (const path of missingPaths) {
			const paramName = path.split(".").pop() ?? path;
			diagnostics.push({
				...base,
				severity: ts101SchemaMissingType.meta.defaultSeverity,
				message: `Property "${paramName}" at ${path} has no type declaration. This will cause failures in Azure AI Foundry, OpenAI strict mode, and other typed clients.`,
				suggestion: `Add a "type" field (e.g. "string", "number", "boolean", "object", "array") to the property definition.`,
			});
		}

		return diagnostics;
	},
};
