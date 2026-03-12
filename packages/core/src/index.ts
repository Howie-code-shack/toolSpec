import type {
	AnalysisResult,
	RuleSeverityOverride,
	ToolDefinition,
} from "./types/index.js";
import { RuleRegistry } from "./rules/index.js";
import { computeServerScore, computeToolScore } from "./scoring/index.js";

export interface EngineOptions {
	/** Per-rule severity overrides */
	rules?: Record<string, RuleSeverityOverride>;
}

/**
 * The ToolSpec engine. Analyses tool definitions using the rule registry
 * and produces scored diagnostics.
 *
 * This is a pure, side-effect-free function. The same inputs always
 * produce the same outputs. It has no dependencies on I/O, network,
 * or the file system — those concerns belong to the CLI and loader layers.
 */
export function analyse(
	tools: ToolDefinition[],
	options: EngineOptions = {},
): AnalysisResult {
	const registry = new RuleRegistry({ overrides: options.rules });
	const diagnostics = registry.analyseAll(tools);

	// Compute per-tool scores
	const toolScores = tools.map((tool) => computeToolScore(tool, diagnostics));

	// Compute per-server scores
	const serverNames = [...new Set(tools.map((t) => t.serverName))];
	const serverScores = serverNames.map((name) =>
		computeServerScore(name, toolScores, diagnostics),
	);

	return {
		diagnostics,
		toolScores,
		serverScores,
		toolCount: tools.length,
		serverCount: serverNames.length,
		timestamp: new Date().toISOString(),
	};
}

// Re-export everything consumers need
export { RuleRegistry, BUILT_IN_RULES } from "./rules/index.js";
export { computeToolScore, computeServerScore } from "./scoring/index.js";
export type * from "./types/index.js";
