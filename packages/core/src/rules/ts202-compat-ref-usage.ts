import type { Diagnostic, JSONSchemaProperty, Rule, ToolDefinition } from "../types/index.js";

/**
 * Recursively find `$ref` usage in schema properties.
 */
function findRefUsage(
	properties: Record<string, JSONSchemaProperty>,
	path: string,
): { path: string; name: string; ref: string }[] {
	const found: { path: string; name: string; ref: string }[] = [];

	for (const [name, prop] of Object.entries(properties)) {
		const fullPath = `${path}.${name}`;

		if (prop.$ref) {
			found.push({ path: fullPath, name, ref: prop.$ref });
		}

		// Recurse into nested object properties
		if (prop.properties) {
			found.push(...findRefUsage(prop.properties, fullPath));
		}

		// Recurse into array item schemas
		if (prop.items) {
			if (prop.items.$ref) {
				found.push({ path: `${fullPath}.items`, name: `${name}.items`, ref: prop.items.$ref });
			}
			if (prop.items.properties) {
				found.push(...findRefUsage(prop.items.properties, `${fullPath}.items`));
			}
		}

		// Check inside composition keywords for refs
		for (const keyword of ["anyOf", "oneOf", "allOf"] as const) {
			const variants = prop[keyword];
			if (Array.isArray(variants)) {
				for (let i = 0; i < variants.length; i++) {
					const variant = variants[i];
					if (variant.$ref) {
						found.push({
							path: `${fullPath}.${keyword}[${i}]`,
							name: `${name}.${keyword}[${i}]`,
							ref: variant.$ref,
						});
					}
				}
			}
		}
	}

	return found;
}

/**
 * TS202: Client Compatibility — $ref Usage
 *
 * OpenAI strict function calling mode does not support `$ref` in schemas.
 * All definitions must be inlined. Some other clients also struggle with
 * reference resolution.
 */
export const ts202CompatRefUsage: Rule = {
	meta: {
		id: "TS202",
		name: "compat-ref-usage",
		description:
			"Flags $ref usage in inputSchema — unsupported by OpenAI strict mode. " +
			"All definitions must be inlined for maximum client compatibility.",
		category: "client-compat",
		defaultSeverity: "warning",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS202",
			category: ts202CompatRefUsage.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		// Check top-level schema for $ref
		if (tool.inputSchema.$ref) {
			diagnostics.push({
				...base,
				severity: ts202CompatRefUsage.meta.defaultSeverity,
				message: `Tool "${tool.name}" inputSchema uses "$ref" at the top level. OpenAI strict mode does not support $ref.`,
				suggestion: `Inline the referenced definition directly into the inputSchema instead of using $ref.`,
			});
		}

		// Check properties
		const properties = tool.inputSchema.properties;
		if (!properties) return diagnostics;

		const found = findRefUsage(properties, "inputSchema.properties");

		for (const { path, name, ref } of found) {
			diagnostics.push({
				...base,
				severity: ts202CompatRefUsage.meta.defaultSeverity,
				message: `Property "${name}" at ${path} uses "$ref": "${ref}". OpenAI strict mode does not support $ref and requires inlined definitions.`,
				suggestion: `Replace the $ref with the inlined schema definition for "${ref}".`,
			});
		}

		return diagnostics;
	},
};
