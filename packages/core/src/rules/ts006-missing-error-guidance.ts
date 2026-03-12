import type { Diagnostic, Rule, ToolDefinition } from "../types/index.js";

/**
 * Phrases that indicate the description documents output/return behaviour.
 */
const OUTPUT_INDICATORS = [
	"returns",
	"return value",
	"responds with",
	"response contains",
	"response includes",
	"output",
	"produces",
	"yields",
	"result is",
	"result contains",
	"result includes",
	"results in",
	"gives back",
	"emits",
	"provides",
];

/**
 * Phrases that indicate the description documents error/failure behaviour.
 */
const ERROR_INDICATORS = [
	"error",
	"errors",
	"fail",
	"fails",
	"failure",
	"throw",
	"throws",
	"exception",
	"invalid",
	"not found",
	"404",
	"400",
	"401",
	"403",
	"500",
	"status code",
	"http ",
	"empty result",
	"no results",
	"null",
	"undefined",
	"missing",
	"does not exist",
];

/**
 * Phrases indicating the description documents the output shape/structure.
 */
const SHAPE_INDICATORS = [
	"json",
	"object",
	"array",
	"string",
	"number",
	"boolean",
	"list of",
	"map of",
	"contains the field",
	"with fields",
	"with properties",
	"schema",
	"format:",
	"structure:",
	"shape:",
	"includes:",
];

function hasOutputGuidance(description: string): boolean {
	const lower = description.toLowerCase();
	return OUTPUT_INDICATORS.some((indicator) => lower.includes(indicator));
}

function hasErrorGuidance(description: string): boolean {
	const lower = description.toLowerCase();
	return ERROR_INDICATORS.some((indicator) => lower.includes(indicator));
}

function hasShapeGuidance(description: string): boolean {
	const lower = description.toLowerCase();
	return SHAPE_INDICATORS.some((indicator) => lower.includes(indicator));
}

/**
 * Minimum description length to trigger checks.
 * Very short descriptions are caught by TS001.
 */
const MIN_DESC_LENGTH = 20;

/**
 * TS006: Missing Error Guidance
 *
 * Checks that the description documents what the tool returns on success
 * and what happens on failure. Without this, the FM cannot handle the tool's
 * output or recover from errors.
 */
export const ts006MissingErrorGuidance: Rule = {
	meta: {
		id: "TS006",
		name: "missing-error-guidance",
		description:
			"Tool description should document what it returns on success and " +
			"how it behaves on error, so the FM can handle outputs and recover from failures.",
		category: "missing-error-guidance",
		defaultSeverity: "warning",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS006",
			category: ts006MissingErrorGuidance.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		// Skip tools with no or trivially short description — TS001 handles those
		if (!tool.description || tool.description.trim().length < MIN_DESC_LENGTH) {
			return diagnostics;
		}

		const desc = tool.description.trim();
		const hasOutput = hasOutputGuidance(desc);
		const hasError = hasErrorGuidance(desc);
		const hasShape = hasShapeGuidance(desc);
		const hasOutputSchema = Boolean(tool.outputSchema);

		// No mention of what the tool returns (and no outputSchema)
		if (!hasOutput && !hasShape && !hasOutputSchema) {
			diagnostics.push({
				...base,
				severity: "warning",
				message: `Tool "${tool.name}" description does not explain what it returns. The FM will not know what data to expect from calling this tool.`,
				suggestion:
					"Add a sentence describing the return value, e.g. " +
					'"Returns a JSON object with fields: id, name, and status." ' +
					"Alternatively, provide an outputSchema.",
			});
		}

		// No mention of error/failure behaviour
		if (!hasError) {
			diagnostics.push({
				...base,
				severity: "info",
				message: `Tool "${tool.name}" description does not document error or failure behaviour. The FM may not handle errors gracefully if it doesn't know what failures look like.`,
				suggestion:
					"Add notes about common error conditions, e.g. " +
					'"Returns an error if the user ID does not exist" or ' +
					'"Fails with 429 if rate limit is exceeded."',
			});
		}

		return diagnostics;
	},
};
