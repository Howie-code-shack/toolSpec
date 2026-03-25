import { Command } from "commander";
import { analyse } from "@toolspec/core";
import type { Severity, ToolDefinition } from "@toolspec/core";
import { loadFromFile } from "../loaders/index.js";
import { reportConsole, reportJSON } from "../reporters/index.js";

interface LintOptions {
	format: string;
	failOn: string;
	quiet: boolean;
	stdio?: string;
	http?: string;
}

async function loadTools(target: string, opts: LintOptions): Promise<ToolDefinition[]> {
	if (opts.stdio) {
		const { loadFromStdio } = await import("@toolspec/mcp-loader");
		return loadFromStdio(opts.stdio);
	}

	if (opts.http) {
		const { loadFromHttp } = await import("@toolspec/mcp-loader");
		return loadFromHttp(opts.http);
	}

	return loadFromFile(target);
}

export const lintCommand = new Command("lint")
	.description("Analyse MCP tool definitions for quality issues")
	.argument("[target]", "Path to a JSON file containing tool definitions")
	.option("-f, --format <format>", "Output format: console, json", "console")
	.option(
		"--fail-on <severity>",
		"Exit with code 1 if any diagnostic meets this severity: error, warning, info",
		"error",
	)
	.option("-q, --quiet", "Suppress output, only set exit code", false)
	.option(
		"--stdio <command>",
		"Load tools from a local MCP server via stdio (e.g. --stdio 'node ./server.js')",
	)
	.option(
		"--http <url>",
		"Load tools from a remote MCP server via Streamable HTTP (e.g. --http http://localhost:3000/mcp)",
	)
	.action(async (target: string | undefined, opts: LintOptions) => {
		try {
			if (!target && !opts.stdio && !opts.http) {
				console.error(
					"Error: provide a file path, --stdio <command>, or --http <url>",
				);
				process.exit(2);
			}

			const tools = await loadTools(target ?? "", opts);

			if (tools.length === 0) {
				if (!opts.quiet) {
					const source = opts.stdio ?? opts.http ?? target;
					console.log("No tools found in", source);
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
