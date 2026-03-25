import type { Diagnostic, JSONSchemaProperty, Rule, ToolDefinition } from "../types/index.js";

/**
 * Recursively find object schemas missing `additionalProperties: false`.
 */
function findMissingAdditionalProperties(
	properties: Record<string, JSONSchemaProperty>,
	path: string,
): { path: string; name: string }[] {
	const found: { path: string; name: string }[] = [];

	for (const [name, prop] of Object.entries(properties)) {
		const fullPath = `${path}.${name}`;

		if (prop.type === "object" && prop.properties && prop.additionalProperties !== false) {
			found.push({ path: fullPath, name });
		}

		// Recurse into nested object properties
		if (prop.properties) {
			found.push(...findMissingAdditionalProperties(prop.properties, fullPath));
		}

		// Recurse into array item schemas
		if (prop.items?.properties) {
			found.push(...findMissingAdditionalProperties(prop.items.properties, `${fullPath}.items`));
		}

		// Check array items that are objects themselves
		if (prop.items?.type === "object" && prop.items.properties && prop.items.additionalProperties !== false) {
			found.push({ path: `${fullPath}.items`, name: `${name}.items` });
		}
	}

	return found;
}

/**
 * TS201: Client Compatibility — Additional Properties
 *
 * OpenAI strict function calling mode requires `additionalProperties: false`
 * on every object schema. Without it, tool calls will be rejected.
 * Azure AI Foundry also benefits from explicit additional properties control.
 */
export const ts201CompatAdditionalProperties: Rule = {
	meta: {
		id: "TS201",
		name: "compat-additional-properties",
		description:
			"Object schemas should set additionalProperties: false for compatibility " +
			"with OpenAI strict mode and Azure AI Foundry.",
		category: "client-compat",
		defaultSeverity: "warning",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS201",
			category: ts201CompatAdditionalProperties.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		// Check top-level inputSchema
		if (
			tool.inputSchema.properties &&
			Object.keys(tool.inputSchema.properties).length > 0 &&
			tool.inputSchema.additionalProperties !== false
		) {
			diagnostics.push({
				...base,
				severity: ts201CompatAdditionalProperties.meta.defaultSeverity,
				message: `Tool "${tool.name}" inputSchema is missing "additionalProperties": false. OpenAI strict mode will reject this schema.`,
				suggestion: `Add "additionalProperties": false to the top-level inputSchema object.`,
			});
		}

		// Check nested object properties
		const properties = tool.inputSchema.properties;
		if (!properties) return diagnostics;

		const found = findMissingAdditionalProperties(properties, "inputSchema.properties");

		for (const { path, name } of found) {
			diagnostics.push({
				...base,
				severity: ts201CompatAdditionalProperties.meta.defaultSeverity,
				message: `Object property "${name}" at ${path} is missing "additionalProperties": false. OpenAI strict mode requires this on all object schemas.`,
				suggestion: `Add "additionalProperties": false to the object schema at ${path}.`,
			});
		}

		return diagnostics;
	},
};
