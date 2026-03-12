import type { Diagnostic, Rule, ToolDefinition } from "../types/index.js";

/**
 * Keywords/phrases that indicate limitations or constraints are documented.
 * Grouped by theme for clarity.
 */
const LIMITATION_INDICATORS = [
	// Rate/size limits
	"rate limit",
	"rate-limit",
	"ratelimit",
	"throttle",
	"quota",
	"max ",
	"maximum",
	"limit of",
	"limited to",
	"up to",
	"at most",
	"no more than",
	// Timeouts / latency
	"timeout",
	"time out",
	"timed out",
	"latency",
	"slow",
	"may take",
	"can take up to",
	// Permissions / auth
	"requires permission",
	"requires auth",
	"must be authenticated",
	"access control",
	"forbidden",
	"unauthori",
	"permission denied",
	"role required",
	// Availability / reliability
	"unavailable",
	"downtime",
	"may fail",
	"can fail",
	"might fail",
	"not available",
	"not supported",
	"unsupported",
	"deprecated",
	"experimental",
	"beta",
	// Error / failure
	"error",
	"fail",
	"exception",
	"throw",
	"invalid",
	// Constraints
	"only supports",
	"only works",
	"does not support",
	"doesn't support",
	"cannot",
	"can't",
	"must be",
	"must not",
	"should not",
	"not allowed",
	"restricted",
	"constraint",
	"caveat",
	"limitation",
	"note:",
	"warning:",
	"important:",
	"caution:",
];

/**
 * Parameters whose types/domains suggest the tool has constraints
 * worth documenting (e.g. page size, offset, max results).
 */
const CONSTRAINT_PARAM_PATTERNS = [
	/\bmax/i,
	/\blimit\b/i,
	/\boffset\b/i,
	/\bpage/i,
	/\btimeout/i,
	/\bretry/i,
	/\bbatch/i,
];

/**
 * Check whether the description mentions any limitation-related language.
 */
function hasLimitationLanguage(description: string): boolean {
	const lower = description.toLowerCase();
	return LIMITATION_INDICATORS.some((indicator) => lower.includes(indicator));
}

/**
 * Detect parameters whose names suggest constraints exist
 * but the description says nothing about them.
 */
function findConstraintParams(tool: ToolDefinition): string[] {
	const props = tool.inputSchema.properties ?? {};
	return Object.keys(props).filter((name) =>
		CONSTRAINT_PARAM_PATTERNS.some((pattern) => pattern.test(name)),
	);
}

/**
 * TS002: Unstated Limitations
 *
 * Checks that a tool description documents constraints, limits, failure modes,
 * or permission requirements — especially when the schema itself hints at them
 * (e.g. parameters named "maxResults", "timeout", "limit").
 */
export const ts002UnstatedLimitations: Rule = {
	meta: {
		id: "TS002",
		name: "unstated-limitations",
		description:
			"Tool description should document constraints, rate limits, " +
			"failure modes, or permission requirements so the FM can make informed decisions.",
		category: "unstated-limitations",
		defaultSeverity: "warning",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS002",
			severity: ts002UnstatedLimitations.meta.defaultSeverity,
			category: ts002UnstatedLimitations.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		// Skip tools with no description — TS001 already catches this
		if (!tool.description || tool.description.trim().length === 0) {
			return diagnostics;
		}

		const desc = tool.description.trim();

		// Check for constraint-suggesting parameter names
		const constraintParams = findConstraintParams(tool);
		if (constraintParams.length > 0 && !hasLimitationLanguage(desc)) {
			diagnostics.push({
				...base,
				message: `Tool "${tool.name}" has parameters suggesting constraints (${constraintParams.join(", ")}) but the description does not mention any limitations, bounds, or failure conditions.`,
				suggestion: `Document what the constraints are — e.g. valid ranges for ${constraintParams[0]}, default values, or what happens when limits are exceeded.`,
			});
		}

		// If the tool has many parameters (complex input), limitations become more important
		const propCount = Object.keys(tool.inputSchema.properties ?? {}).length;
		if (propCount >= 5 && !hasLimitationLanguage(desc)) {
			diagnostics.push({
				...base,
				severity: "info",
				message: `Tool "${tool.name}" accepts ${propCount} parameters but the description mentions no constraints or limitations. Complex tools benefit from documenting which parameter combinations are valid and what the failure modes are.`,
				suggestion:
					"Add notes about required parameter combinations, valid ranges, " +
					"rate limits, or error conditions.",
			});
		}

		return diagnostics;
	},
};
