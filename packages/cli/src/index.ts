import { Command } from "commander";
import { lintCommand } from "./commands/lint.js";

const program = new Command()
	.name("toolspec")
	.description("MCP Tool Schema Governance & Quality CLI")
	.version("0.1.0");

program.addCommand(lintCommand);

program.parse();
