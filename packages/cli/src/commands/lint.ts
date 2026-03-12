import { Command } from "commander";
import { analyse } from "@toolspec/core";
import type { Severity } from "@toolspec/core";
import { loadFromFile } from "../loaders/index.js";
import { reportConsole, reportJSON } from "../reporters/index.js";

export const lintCommand = new Command("lint")
	.description("Analyse MCP tool definitions for quality issues")
	.argument("<target>", "Path to a JSON file containing tool definitions")
	.option("-f, --format <format>", "Output format: console, json", "console")
	.option(
		"--fail-on <severity>",
		"Exit with code 1 if any diagnostic meets this severity: error, warning, info",
		"error",
	)
	.option("-q, --quiet", "Suppress output, only set exit code", false)
	.action(async (target: string, opts: { format: string; failOn: string; quiet: boolean }) => {
		try {
			// Load tools
			const tools = await loadFromFile(target);

			if (tools.length === 0) {
				if (!opts.quiet) {
					console.log("No tools found in", target);
				}
				process.exit(0);
			}

			// Analyse
			const result = analyse(tools);

			// Report
			if (!opts.quiet) {
				switch (opts.format) {
					case "json":
						console.log(reportJSON(result));
						break;
					case "console":
					default:
						console.log(reportConsole(result));
						break;
				}
			}

			// Determine exit code
			const failSeverity = opts.failOn as Severity;
			const severityOrder: Severity[] = ["info", "warning", "error"];
			const failIndex = severityOrder.indexOf(failSeverity);

			const hasFailure = result.diagnostics.some((d) => {
				const diagIndex = severityOrder.indexOf(d.severity);
				return diagIndex >= failIndex;
			});

			if (hasFailure) {
				process.exit(1);
			}
		} catch (err) {
			console.error(
				`Error: ${err instanceof Error ? err.message : String(err)}`,
			);
			process.exit(2);
		}
	});
