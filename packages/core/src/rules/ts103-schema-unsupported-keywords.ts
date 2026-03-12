import type { Diagnostic, JSONSchemaProperty, Rule, ToolDefinition } from "../types/index.js";

/**
 * Composition keywords that are unsupported or problematic in major clients.
 */
const COMPOSITION_KEYWORDS = ["anyOf", "oneOf", "allOf"] as const;

/**
 * Recursively find uses of composition keywords in the schema.
 */
function findCompositionKeywords(
	properties: Record<string, JSONSchemaProperty>,
	path: string,
): { path: string; name: string; keyword: string }[] {
	const found: { path: string; name: string; keyword: string }[] = [];

	for (const [name, prop] of Object.entries(properties)) {
		const fullPath = `${path}.${name}`;

		for (const keyword of COMPOSITION_KEYWORDS) {
			if (Array.isArray(prop[keyword]) && (prop[keyword] as unknown[]).length > 0) {
				found.push({ path: fullPath, name, keyword });
			}
		}

		// Recurse into nested object properties
		if (prop.properties) {
			found.push(...findCompositionKeywords(prop.properties, fullPath));
		}

		// Recurse into array item schemas
		if (prop.items?.properties) {
			found.push(...findCompositionKeywords(prop.items.properties, `${fullPath}.items`));
		}

		// Also check inside array items directly
		if (prop.items) {
			for (const keyword of COMPOSITION_KEYWORDS) {
				const items = prop.items as Record<string, unknown>;
				if (Array.isArray(items[keyword]) && (items[keyword] as unknown[]).length > 0) {
					found.push({ path: `${fullPath}.items`, name: `${name}.items`, keyword });
				}
			}
		}
	}

	return found;
}

/**
 * Check the top-level inputSchema for composition keywords too.
 */
function findTopLevelComposition(schema: Record<string, unknown>): { keyword: string }[] {
	const found: { keyword: string }[] = [];
	for (const keyword of COMPOSITION_KEYWORDS) {
		if (Array.isArray(schema[keyword]) && (schema[keyword] as unknown[]).length > 0) {
			found.push({ keyword });
		}
	}
	return found;
}

/**
 * TS103: Schema Unsupported Keywords
 *
 * Flags use of `anyOf`, `oneOf`, and `allOf` in tool input schemas.
 * These composition keywords are unsupported by Azure AI Foundry and
 * problematic in OpenAI strict function calling mode.
 */
export const ts103SchemaUnsupportedKeywords: Rule = {
	meta: {
		id: "TS103",
		name: "schema-unsupported-keywords",
		description:
			"Flags anyOf/oneOf/allOf in inputSchema — unsupported by Azure AI Foundry " +
			"and problematic in OpenAI strict function calling mode.",
		category: "schema-structural",
		defaultSeverity: "error",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS103",
			category: ts103SchemaUnsupportedKeywords.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		// Check top-level schema
		const topLevel = findTopLevelComposition(tool.inputSchema as Record<string, unknown>);
		for (const { keyword } of topLevel) {
			diagnostics.push({
				...base,
				severity: ts103SchemaUnsupportedKeywords.meta.defaultSeverity,
				message: `Tool "${tool.name}" inputSchema uses "${keyword}" at the top level. This is unsupported by Azure AI Foundry and may fail in OpenAI strict mode.`,
				suggestion: `Replace "${keyword}" with a simpler schema structure. For union types, consider using an enum or separate optional properties instead.`,
			});
		}

		// Check properties
		const properties = tool.inputSchema.properties;
		if (!properties) return diagnostics;

		const found = findCompositionKeywords(properties, "inputSchema.properties");

		for (const { path, name, keyword } of found) {
			diagnostics.push({
				...base,
				severity: ts103SchemaUnsupportedKeywords.meta.defaultSeverity,
				message: `Property "${name}" at ${path} uses "${keyword}". This is unsupported by Azure AI Foundry and may fail in OpenAI strict mode.`,
				suggestion: `Replace "${keyword}" with a simpler type. For nullable types, use "type": ["string", "null"]. For unions, consider an enum of allowed values.`,
			});
		}

		return diagnostics;
	},
};
