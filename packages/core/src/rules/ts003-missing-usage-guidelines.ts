import type { Diagnostic, Rule, ToolDefinition } from "../types/index.js";

/**
 * Phrases that indicate when to use the tool.
 */
const WHEN_TO_USE_INDICATORS = [
	"use this",
	"use when",
	"useful for",
	"useful when",
	"call this",
	"call when",
	"invoke this",
	"invoke when",
	"designed for",
	"intended for",
	"best for",
	"ideal for",
	"suitable for",
	"meant for",
	"prefer this",
	"choose this",
	"instead of",
	"rather than",
	"alternative to",
	"as opposed to",
	"when you need",
	"when you want",
	"if you need",
	"if you want",
	"to handle",
	"to perform",
	"to accomplish",
];

/**
 * Phrases that differentiate this tool from alternatives.
 */
const DIFFERENTIATION_INDICATORS = [
	"unlike",
	"compared to",
	"in contrast",
	"differs from",
	"instead of",
	"rather than",
	"alternative to",
	"whereas",
	"not the same as",
	"similar to",
	"see also",
	"prefer .* over",
	"for .* use",
];

/**
 * Phrases indicating step/order/workflow guidance.
 */
const WORKFLOW_INDICATORS = [
	"first,",
	"then ",
	"before ",
	"after ",
	"followed by",
	"step ",
	"prerequisite",
	"must first",
	"prior to",
	"next,",
	"finally,",
	"once ",
	"in order to",
];

function hasWhenToUseGuidance(description: string): boolean {
	const lower = description.toLowerCase();
	return WHEN_TO_USE_INDICATORS.some((indicator) => lower.includes(indicator));
}

function hasDifferentiation(description: string): boolean {
	const lower = description.toLowerCase();
	return DIFFERENTIATION_INDICATORS.some((indicator) => {
		if (indicator.includes(".*")) {
			return new RegExp(indicator, "i").test(lower);
		}
		return lower.includes(indicator);
	});
}

function hasWorkflowGuidance(description: string): boolean {
	const lower = description.toLowerCase();
	return WORKFLOW_INDICATORS.some((indicator) => lower.includes(indicator));
}

/**
 * Minimum description length to trigger this rule's checks.
 * Very short descriptions are caught by TS001 instead.
 */
const MIN_DESC_LENGTH = 20;

/**
 * TS003: Missing Usage Guidelines
 *
 * Checks that the description provides guidance on when and how to use
 * the tool — especially important when similar tools exist. Flags tools
 * that lack "when to use" language, workflow/ordering guidance, or
 * differentiation from alternatives.
 */
export const ts003MissingUsageGuidelines: Rule = {
	meta: {
		id: "TS003",
		name: "missing-usage-guidelines",
		description:
			"Tool description should explain when and how to use the tool, " +
			"especially when similar tools exist. Helps the FM choose the right tool.",
		category: "missing-usage-guidelines",
		defaultSeverity: "warning",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS003",
			severity: ts003MissingUsageGuidelines.meta.defaultSeverity,
			category: ts003MissingUsageGuidelines.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		// Skip tools with no or trivially short description — TS001 handles those
		if (!tool.description || tool.description.trim().length < MIN_DESC_LENGTH) {
			return diagnostics;
		}

		const desc = tool.description.trim();

		const hasWhen = hasWhenToUseGuidance(desc);
		const hasDiff = hasDifferentiation(desc);
		const hasWorkflow = hasWorkflowGuidance(desc);

		// If none of the three signals are present, flag it
		if (!hasWhen && !hasDiff && !hasWorkflow) {
			diagnostics.push({
				...base,
				message: `Tool "${tool.name}" description does not explain when to use this tool, how it differs from alternatives, or where it fits in a workflow. The FM may struggle to select it appropriately.`,
				suggestion:
					'Add guidance like "Use this tool when...", "Prefer this over X for...", ' +
					'or "Call this after authenticating to..." to help the FM understand when to choose this tool.',
			});
		}

		return diagnostics;
	},
};
