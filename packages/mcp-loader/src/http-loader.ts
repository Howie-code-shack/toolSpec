import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ToolDefinition } from "@toolspec/core";
import { mapToolsToDefinitions } from "./map-tools.js";

export interface HttpLoaderOptions {
	/** Custom HTTP headers (e.g. for authentication) */
	headers?: Record<string, string>;
	/** Timeout in milliseconds (default: 30_000) */
	timeoutMs?: number;
}

/**
 * Load tool definitions from a remote MCP server via Streamable HTTP transport.
 *
 * @param url - The MCP server endpoint (e.g. "http://localhost:3000/mcp")
 */
export async function loadFromHttp(
	url: string,
	options: HttpLoaderOptions = {},
): Promise<ToolDefinition[]> {
	const { timeoutMs = 30_000, headers } = options;

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(url);
	} catch {
		throw new Error(`Invalid URL: ${url}`);
	}

	const transport = new StreamableHTTPClientTransport(parsedUrl, {
		requestInit: headers ? { headers } : undefined,
	});

	const client = new Client({
		name: "toolspec",
		version: "0.1.0",
	});

	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => {
			transport.close();
			reject(new Error(`Timed out connecting to MCP server at ${url} after ${timeoutMs}ms`));
		}, timeoutMs);
	});

	try {
		await Promise.race([client.connect(transport), timeoutPromise]);

		const serverInfo = client.getServerVersion();
		const serverName = serverInfo?.name ?? inferServerName(url);
		const serverVersion = serverInfo?.version;

		const result = await Promise.race([client.listTools(), timeoutPromise]);

		return mapToolsToDefinitions(result.tools, {
			serverName,
			serverVersion,
			source: "http",
			sourcePath: url,
		});
	} finally {
		await client.close();
	}
}

function inferServerName(url: string): string {
	try {
		const parsed = new URL(url);
		return parsed.hostname.replace(/[^a-zA-Z0-9-_]/g, "-");
	} catch {
		return "unknown-server";
	}
}
