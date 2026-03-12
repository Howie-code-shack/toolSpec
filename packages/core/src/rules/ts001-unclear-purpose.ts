import type { Diagnostic, Rule, ToolDefinition } from "../types/index.js";

/**
 * Minimum description length to be considered meaningful.
 * Descriptions shorter than this are almost certainly inadequate.
 */
const MIN_DESCRIPTION_LENGTH = 20;

/**
 * Common verbs that indicate the description explains what the tool does.
 * We check for at least one action-oriented verb.
 */
const ACTION_VERBS = [
	"get",
	"fetch",
	"retrieve",
	"create",
	"update",
	"delete",
	"remove",
	"search",
	"find",
	"list",
	"send",
	"read",
	"write",
	"execute",
	"run",
	"start",
	"stop",
	"check",
	"validate",
	"convert",
	"transform",
	"generate",
	"compute",
	"calculate",
	"analyse",
	"analyze",
	"parse",
	"format",
	"upload",
	"download",
	"query",
	"submit",
	"publish",
	"subscribe",
	"connect",
	"disconnect",
	"enable",
	"disable",
	"set",
	"configure",
	"monitor",
	"track",
	"log",
	"export",
	"import",
	"sync",
	"merge",
	"split",
	"filter",
	"sort",
	"count",
	"summarise",
	"summarize",
	"extract",
	"invoke",
	"call",
	"trigger",
	"return",
	"provide",
	"display",
	"show",
	"render",
];

/**
 * Check if the description is tautological — essentially just restating
 * the tool name with minor formatting changes.
 */
function isTautological(name: string, description: string): boolean {
	const normName = name.toLowerCase().replace(/[_-]/g, " ").trim();
	const normDesc = description.toLowerCase().trim().replace(/\.$/, "").trim();

	// Exact match after normalisation
	if (normDesc === normName) return true;

	// Description is just "Tool to <name>" or "<name> tool"
	const stripped = normDesc
		.replace(/^(a |the |this )?(tool|function|method|endpoint|api)?\s*(to|for|that)?\s*/i, "")
		.trim();
	if (stripped === normName) return true;

	// Description contains only words already in the tool name
	const nameWords = new Set(normName.split(/\s+/));
	const descWords = normDesc.split(/\s+/).filter((w) => w.length > 2);
	if (descWords.length > 0 && descWords.every((w) => nameWords.has(w))) return true;

	return false;
}

/**
 * Check if the description contains at least one action verb.
 */
function hasActionVerb(description: string): boolean {
	const lower = description.toLowerCase();
	return ACTION_VERBS.some((verb) => {
		// Match the verb as a whole word (not substring of another word)
		const pattern = new RegExp(`\\b${verb}s?\\b`, "i");
		return pattern.test(lower);
	});
}

/**
 * TS001: Unclear Purpose
 *
 * Checks that a tool description clearly states what the tool does.
 * Flags tools with:
 * - Missing descriptions
 * - Descriptions shorter than 20 characters
 * - Tautological descriptions (just restating the tool name)
 * - Descriptions lacking any action verb
 */
export const ts001UnclearPurpose: Rule = {
	meta: {
		id: "TS001",
		name: "unclear-purpose",
		description:
			"Tool description must clearly state what the tool does. " +
			"Checks for missing, too-short, tautological, or verb-less descriptions.",
		category: "unclear-purpose",
		defaultSeverity: "error",
	},

	check(tool: ToolDefinition): Diagnostic[] {
		const diagnostics: Diagnostic[] = [];
		const base = {
			ruleId: "TS001",
			severity: ts001UnclearPurpose.meta.defaultSeverity,
			category: ts001UnclearPurpose.meta.category,
			toolName: tool.name,
			serverName: tool.serverName,
		} as const;

		// No description at all
		if (!tool.description || tool.description.trim().length === 0) {
			diagnostics.push({
				...base,
				message: `Tool "${tool.name}" has no description. The FM has no guidance on what this tool does or when to use it.`,
				suggestion: `Add a description that explains the tool's purpose, expected inputs, and what it returns.`,
			});
			return diagnostics; // No point checking further
		}

		const desc = tool.description.trim();

		// Too short
		if (desc.length < MIN_DESCRIPTION_LENGTH) {
			diagnostics.push({
				...base,
				severity: "warning",
				message: `Tool "${tool.name}" description is only ${desc.length} characters. Descriptions under ${MIN_DESCRIPTION_LENGTH} characters rarely convey enough information for reliable tool selection.`,
				suggestion:
					"Expand the description to explain what the tool does, what parameters it expects, and what it returns.",
			});
		}

		// Tautological
		if (isTautological(tool.name, desc)) {
			diagnostics.push({
				...base,
				message: `Tool "${tool.name}" description is tautological — it just restates the tool name without adding information.`,
				suggestion: `Rewrite the description to explain the tool's purpose, behaviour, and constraints beyond what the name implies.`,
			});
		}

		// No action verb
		if (desc.length >= MIN_DESCRIPTION_LENGTH && !hasActionVerb(desc)) {
			diagnostics.push({
				...base,
				severity: "warning",
				message: `Tool "${tool.name}" description lacks an action verb. Without a verb, the FM may struggle to understand what action this tool performs.`,
				suggestion: `Start the description with a verb like "Retrieves...", "Creates...", "Searches..." to clearly state the tool's action.`,
			});
		}

		return diagnostics;
	},
};
