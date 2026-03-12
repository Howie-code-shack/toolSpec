import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { ToolDefinition, JSONSchema } from "@toolspec/core";

/**
 * Raw tool shape as it appears in an MCP tools/list response or export file.
 */
interface RawToolEntry {
	name: string;
	description?: string;
	inputSchema?: Record<string, unknown>;
	outputSchema?: Record<string, unknown>;
	annotations?: Record<string, unknown>;
}

/**
 * The file format ToolSpec expects: either a bare array of tools,
 * or an object with a `tools` array and optional `serverName`/`serverVersion`.
 */
interface ToolSpecFile {
	serverName?: string;
	serverVersion?: string;
	tools: RawToolEntry[];
}

/**
 * Load tool definitions from a JSON file.
 *
 * Accepts two formats:
 *   1. `{ serverName?: string, tools: [...] }`
 *   2. A bare array `[...]` of tool objects
 *
 * In both cases, each tool must have at least a `name` and `inputSchema`.
 */
export async function loadFromFile(filePath: string): Promise<ToolDefinition[]> {
	const absPath = resolve(filePath);
	const raw = await readFile(absPath, "utf-8");

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		throw new Error(`Failed to parse ${filePath} as JSON`);
	}

	let file: ToolSpecFile;

	if (Array.isArray(parsed)) {
		file = { tools: parsed as RawToolEntry[] };
	} else if (parsed && typeof parsed === "object" && "tools" in parsed) {
		file = parsed as ToolSpecFile;
	} else {
		throw new Error(
			`${filePath} must be a JSON array of tools or an object with a "tools" array`,
		);
	}

	const serverName = file.serverName ?? inferServerName(filePath);

	return file.tools.map((raw) => {
		if (!raw.name) {
			throw new Error(`Tool entry in ${filePath} is missing a "name" field`);
		}

		return {
			serverName,
			serverVersion: file.serverVersion,
			name: raw.name,
			description: raw.description,
			inputSchema: (raw.inputSchema as JSONSchema) ?? { type: "object" as const },
			outputSchema: raw.outputSchema as JSONSchema | undefined,
			annotations: raw.annotations as ToolDefinition["annotations"],
			source: "file" as const,
			sourcePath: absPath,
		};
	});
}

/**
 * Infer a server name from the file path when none is provided.
 */
function inferServerName(filePath: string): string {
	const base = filePath.split("/").pop() ?? filePath;
	return base.replace(/\.json$/i, "").replace(/[^a-zA-Z0-9-_]/g, "-");
}
