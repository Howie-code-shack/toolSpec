import chalk from "chalk";
import Table from "cli-table3";
import type { AnalysisResult, Diagnostic, Severity } from "@toolspec/core";

const SEVERITY_ICONS: Record<Severity, string> = {
	error: chalk.red("✖"),
	warning: chalk.yellow("⚠"),
	info: chalk.blue("ℹ"),
};

const SEVERITY_COLORS: Record<Severity, (s: string) => string> = {
	error: chalk.red,
	warning: chalk.yellow,
	info: chalk.blue,
};

function scoreColor(score: number): (s: string) => string {
	if (score >= 80) return chalk.green;
	if (score >= 60) return chalk.yellow;
	return chalk.red;
}

/**
 * Format diagnostics for human-readable console output.
 */
export function reportConsole(result: AnalysisResult): string {
	const lines: string[] = [];

	// Header
	lines.push("");
	lines.push(chalk.bold.cyan("  ToolSpec") + chalk.dim(" — MCP Tool Quality Report"));
	lines.push(chalk.dim("  ─".repeat(30)));
	lines.push("");

	if (result.diagnostics.length === 0) {
		lines.push(chalk.green("  ✓ No issues found across ") + chalk.bold(`${result.toolCount} tools`));
		lines.push("");
		return lines.join("\n");
	}

	// Group diagnostics by server → tool
	const grouped = groupDiagnostics(result.diagnostics);

	for (const [serverName, toolMap] of grouped) {
		lines.push(chalk.bold(`  ${serverName}`));

		for (const [toolName, diags] of toolMap) {
			lines.push(chalk.dim(`    ${toolName}`));

			for (const diag of diags) {
				const icon = SEVERITY_ICONS[diag.severity];
				const color = SEVERITY_COLORS[diag.severity];
				lines.push(`      ${icon} ${color(diag.ruleId)} ${diag.message}`);
				if (diag.suggestion) {
					lines.push(chalk.dim(`        💡 ${diag.suggestion}`));
				}
			}
			lines.push("");
		}
	}

	// Score summary table
	if (result.serverScores.length > 0) {
		lines.push(chalk.dim("  ─".repeat(30)));
		lines.push(chalk.bold("  Scores"));
		lines.push("");

		const table = new Table({
			chars: {
				top: "", "top-mid": "", "top-left": "", "top-right": "",
				bottom: "", "bottom-mid": "", "bottom-left": "", "bottom-right": "",
				left: "    ", "left-mid": "", mid: "─", "mid-mid": "─",
				right: "", "right-mid": "", middle: " │ ",
			},
			style: { "padding-left": 0, "padding-right": 1 },
			head: [
				chalk.dim("Server"),
				chalk.dim("Score"),
				chalk.dim("Errors"),
				chalk.dim("Warnings"),
				chalk.dim("Info"),
			],
		});

		for (const server of result.serverScores) {
			const sc = scoreColor(server.averageScore);
			const counts = { error: 0, warning: 0, info: 0 };
			for (const ts of server.toolScores) {
				counts.error += ts.diagnosticCounts.error;
				counts.warning += ts.diagnosticCounts.warning;
				counts.info += ts.diagnosticCounts.info;
			}

			table.push([
				server.serverName,
				sc(`${server.averageScore}/100`),
				counts.error > 0 ? chalk.red(String(counts.error)) : chalk.dim("0"),
				counts.warning > 0 ? chalk.yellow(String(counts.warning)) : chalk.dim("0"),
				counts.info > 0 ? chalk.blue(String(counts.info)) : chalk.dim("0"),
			]);
		}

		lines.push(table.toString());
		lines.push("");
	}

	// Summary line
	const errors = result.diagnostics.filter((d) => d.severity === "error").length;
	const warnings = result.diagnostics.filter((d) => d.severity === "warning").length;
	const infos = result.diagnostics.filter((d) => d.severity === "info").length;

	const parts: string[] = [];
	if (errors > 0) parts.push(chalk.red(`${errors} error${errors !== 1 ? "s" : ""}`));
	if (warnings > 0) parts.push(chalk.yellow(`${warnings} warning${warnings !== 1 ? "s" : ""}`));
	if (infos > 0) parts.push(chalk.blue(`${infos} info`));

	lines.push(`  Found ${parts.join(", ")} across ${result.toolCount} tool${result.toolCount !== 1 ? "s" : ""}`);
	lines.push("");

	return lines.join("\n");
}

/**
 * Format diagnostics as a JSON string for machine consumption.
 */
export function reportJSON(result: AnalysisResult): string {
	return JSON.stringify(result, null, 2);
}

/**
 * Group diagnostics by server name → tool name for display.
 */
function groupDiagnostics(
	diagnostics: Diagnostic[],
): Map<string, Map<string, Diagnostic[]>> {
	const map = new Map<string, Map<string, Diagnostic[]>>();

	for (const diag of diagnostics) {
		if (!map.has(diag.serverName)) {
			map.set(diag.serverName, new Map());
		}
		const serverMap = map.get(diag.serverName)!;
		if (!serverMap.has(diag.toolName)) {
			serverMap.set(diag.toolName, []);
		}
		serverMap.get(diag.toolName)!.push(diag);
	}

	return map;
}
