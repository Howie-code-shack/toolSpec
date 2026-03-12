import type { ToolDefinition } from "@toolspec/core";

/**
 * Load tool definitions from a local MCP server via stdio transport.
 *
 * @param command - The command to spawn (e.g. "node ./build/index.js")
 * @returns Array of tool definitions from the server
 *
 * TODO: Implement in Phase 2 using @modelcontextprotocol/sdk Client + StdioClientTransport
 */
export async function loadFromStdio(_command: string): Promise<ToolDefinition[]> {
	throw new Error(
		"MCP stdio loader is not yet implemented. Use file-based loading for now: toolspec lint tools.json",
	);
}
