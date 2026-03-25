import type { Diagnostic, JSONSchemaProperty, Rule, ToolDefinition } from "../types/index.js";

/**
 * Find properties in an object schema that are not listed in the `required` array.
 */
function findUnrequiredProperties(
	properties: Record<string, JSONSchemaProperty>,
	required: string[] | undefined,
	path: string,
): { path: string; names: string[] }[] {
	const found: { path: string; names: string[] }[] = [];
	const requiredSet = new Set(required ?? []);

	const unrequired = Object.keys(properties).filter((name) => !requiredSet.has(name));
	if (unrequired.length > 0) {
		found.push({ path, names: unrequired });
	}

	// Recurse into nested object properties
	for (const [name, prop] of Object.entries(properties)) {
		const fullPath = `${path}.${name}`;

		if (prop.type === "object" && prop.properties) {
			found.push(...findUnrequiredProperties(prop.properties, prop.required, fullPath));
		}

		// Recurse into array item schemas
		if (prop.items?.type === "object" && prop.items.properties) {
			found.push(
				...findUnrequiredProperties(prop.items.properties, prop.items.required, `${fullPath}.items`),
			);
		}
	}

	return found;
}

/**
 * TS203: Client Compatibility — All Properties Required
 *
 * OpenAI strict function calling mode requires every property to be listed
 * in the `required` array. Optional parameters must use a nullable type
 * (e.g. `"type": ["string", "null"]`) with a default of `null` instead of
 * being omitted from `required`.
 */
export const ts203CompatRequiredAll: Rule = {
	meta: {
		id: "TS203",
		name: "compat-required-all",
		description:
			"All properties should be listed in the required array for compatibility " +
			"with OpenAI strict mode. Use nullable types for optional parameters.",
		category: "client-compat",
		defaultSeverity: "warning",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS203",
			category: ts203CompatRequiredAll.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		const properties = tool.inputSchema.properties;
		if (!properties || Object.keys(properties).length === 0) return diagnostics;

		const allFound = findUnrequiredProperties(
			properties,
			tool.inputSchema.required,
			"inputSchema",
		);

		for (const { path, names } of allFound) {
			const nameList = names.map((n) => `"${n}"`).join(", ");
			const plural = names.length > 1;
			diagnostics.push({
				...base,
				severity: ts203CompatRequiredAll.meta.defaultSeverity,
				message: `${plural ? "Properties" : "Property"} ${nameList} at ${path} ${plural ? "are" : "is"} not in the "required" array. OpenAI strict mode requires all properties to be listed as required.`,
				suggestion: `Add ${nameList} to the "required" array. For optional parameters, use a nullable type like "type": ["string", "null"] with a default of null.`,
			});
		}

		return diagnostics;
	},
};
