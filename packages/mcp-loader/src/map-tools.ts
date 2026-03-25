import type { ToolDefinition, JSONSchema } from "@toolspec/core";

interface MapOptions {
	serverName: string;
	serverVersion?: string;
	source: "stdio" | "http";
	sourcePath: string;
}

interface McpTool {
	name: string;
	description?: string;
	inputSchema: Record<string, unknown>;
	outputSchema?: Record<string, unknown>;
	annotations?: Record<string, unknown>;
}

/**
 * Map raw MCP SDK tool objects to ToolSpec ToolDefinition[].
 *
 * Shared between stdio and HTTP loaders so mapping logic stays in one place.
 */
export function mapToolsToDefinitions(
	tools: McpTool[],
	options: MapOptions,
): ToolDefinition[] {
	return tools.map((tool) => ({
		serverName: options.serverName,
		serverVersion: options.serverVersion,
		name: tool.name,
		description: tool.description,
		inputSchema: (tool.inputSchema as JSONSchema) ?? { type: "object" as const },
		outputSchema: tool.outputSchema as JSONSchema | undefined,
		annotations: tool.annotations as ToolDefinition["annotations"],
		source: options.source,
		sourcePath: options.sourcePath,
	}));
}
