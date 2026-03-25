import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ToolDefinition } from "@toolspec/core";
import { mapToolsToDefinitions } from "./map-tools.js";

export interface StdioLoaderOptions {
	/** Environment variables to pass to the spawned process */
	env?: Record<string, string>;
	/** Working directory for the spawned process */
	cwd?: string;
	/** Timeout in milliseconds for the connection + tool listing (default: 30_000) */
	timeoutMs?: number;
}

/**
 * Load tool definitions from a local MCP server via stdio transport.
 *
 * Spawns the given command, connects as an MCP client, calls tools/list,
 * and returns the results as ToolDefinition[].
 *
 * @param command - The command to spawn (e.g. "node ./build/index.js" or "npx -y @mcp/server-fs")
 * @param options - Optional configuration for the spawned process
 */
export async function loadFromStdio(
	command: string,
	options: StdioLoaderOptions = {},
): Promise<ToolDefinition[]> {
	const { timeoutMs = 30_000, env, cwd } = options;

	const parts = command.split(/\s+/);
	const [cmd, ...args] = parts;
	if (!cmd) {
		throw new Error("Command string cannot be empty");
	}

	const transport = new StdioClientTransport({
		command: cmd,
		args,
		env: env ? { ...process.env, ...env } as Record<string, string> : undefined,
		cwd,
		stderr: "pipe",
	});

	const client = new Client({
		name: "toolspec",
		version: "0.1.0",
	});

	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => {
			transport.close();
			reject(new Error(`Timed out connecting to MCP server after ${timeoutMs}ms`));
		}, timeoutMs);
	});

	try {
		await Promise.race([client.connect(transport), timeoutPromise]);

		const serverInfo = client.getServerVersion();
		const serverName = serverInfo?.name ?? inferServerName(command);
		const serverVersion = serverInfo?.version;

		const result = await Promise.race([client.listTools(), timeoutPromise]);

		return mapToolsToDefinitions(result.tools, {
			serverName,
			serverVersion,
			source: "stdio",
			sourcePath: command,
		});
	} finally {
		await client.close();
	}
}

function inferServerName(command: string): string {
	const last = command.split(/\s+/).pop() ?? command;
	return last
		.replace(/^.*[\\/]/, "")
		.replace(/\.[^.]+$/, "")
		.replace(/[^a-zA-Z0-9-_]/g, "-");
}
