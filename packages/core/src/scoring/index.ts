import type {
	Diagnostic,
	ServerScore,
	Severity,
	SmellCategory,
	ToolDefinition,
	ToolScore,
} from "../types/index.js";

/**
 * Weight applied to each severity when computing scores.
 * An error deducts more than a warning, which deducts more than info.
 */
const SEVERITY_WEIGHTS: Record<Severity, number> = {
	error: 15,
	warning: 8,
	info: 3,
};

/**
 * All smell categories for initialising score maps.
 */
const ALL_CATEGORIES: SmellCategory[] = [
	"unclear-purpose",
	"unstated-limitations",
	"missing-usage-guidelines",
	"opaque-parameters",
	"missing-examples",
	"missing-error-guidance",
	"schema-structural",
	"client-compat",
	"metadata",
];

/**
 * Compute a quality score (0–100) for a single tool based on its diagnostics.
 */
export function computeToolScore(
	tool: ToolDefinition,
	diagnostics: Diagnostic[],
): ToolScore {
	const toolDiags = diagnostics.filter(
		(d) => d.toolName === tool.name && d.serverName === tool.serverName,
	);

	// Start at 100 and deduct based on diagnostics
	let totalDeduction = 0;
	const categoryDeductions: Record<string, number> = {};
	const counts: Record<Severity, number> = { error: 0, warning: 0, info: 0 };

	for (const diag of toolDiags) {
		const weight = SEVERITY_WEIGHTS[diag.severity];
		totalDeduction += weight;
		categoryDeductions[diag.category] = (categoryDeductions[diag.category] ?? 0) + weight;
		counts[diag.severity]++;
	}

	const score = Math.max(0, Math.min(100, 100 - totalDeduction));

	// Per-category scores (100 minus category-specific deductions)
	const categoryScores = {} as Record<SmellCategory, number>;
	for (const cat of ALL_CATEGORIES) {
		const deduction = categoryDeductions[cat] ?? 0;
		categoryScores[cat] = Math.max(0, Math.min(100, 100 - deduction));
	}

	return {
		toolName: tool.name,
		serverName: tool.serverName,
		score,
		categoryScores,
		diagnosticCounts: counts,
	};
}

/**
 * Compute aggregate scores for a server from its tool scores.
 */
export function computeServerScore(
	serverName: string,
	toolScores: ToolScore[],
	diagnostics: Diagnostic[],
): ServerScore {
	const serverToolScores = toolScores.filter((ts) => ts.serverName === serverName);
	const avg =
		serverToolScores.length > 0
			? serverToolScores.reduce((sum, ts) => sum + ts.score, 0) / serverToolScores.length
			: 100;

	const totalDiags = diagnostics.filter((d) => d.serverName === serverName).length;

	return {
		serverName,
		averageScore: Math.round(avg * 10) / 10,
		toolScores: serverToolScores,
		totalDiagnostics: totalDiags,
	};
}
