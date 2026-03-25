import { describe, it, expect } from "vitest";
import { mapToolsToDefinitions } from "../map-tools.js";

describe("mapToolsToDefinitions", () => {
	it("maps a basic tool with all fields", () => {
		const tools = [
			{
				name: "search",
				description: "Search documents by query",
				inputSchema: {
					type: "object" as const,
					properties: { query: { type: "string" } },
					required: ["query"],
				},
				outputSchema: {
					type: "object" as const,
					properties: { results: { type: "array" } },
				},
				annotations: {
					title: "Search",
					readOnlyHint: true,
				},
			},
		];

		const result = mapToolsToDefinitions(tools, {
			serverName: "test-server",
			serverVersion: "2.0.0",
			source: "stdio",
			sourcePath: "node ./server.js",
		});

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			serverName: "test-server",
			serverVersion: "2.0.0",
			name: "search",
			description: "Search documents by query",
			inputSchema: {
				type: "object",
				properties: { query: { type: "string" } },
				required: ["query"],
			},
			outputSchema: {
				type: "object",
				properties: { results: { type: "array" } },
			},
			annotations: {
				title: "Search",
				readOnlyHint: true,
			},
			source: "stdio",
			sourcePath: "node ./server.js",
		});
	});

	it("maps a tool with missing optional fields", () => {
		const tools = [
			{
				name: "ping",
				inputSchema: { type: "object" as const },
			},
		];

		const result = mapToolsToDefinitions(tools, {
			serverName: "minimal-server",
			source: "http",
			sourcePath: "http://localhost:3000/mcp",
		});

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("ping");
		expect(result[0].description).toBeUndefined();
		expect(result[0].serverVersion).toBeUndefined();
		expect(result[0].outputSchema).toBeUndefined();
		expect(result[0].annotations).toBeUndefined();
		expect(result[0].source).toBe("http");
	});

	it("maps multiple tools from the same server", () => {
		const tools = [
			{ name: "read", inputSchema: { type: "object" as const } },
			{ name: "write", inputSchema: { type: "object" as const } },
			{ name: "delete", inputSchema: { type: "object" as const } },
		];

		const result = mapToolsToDefinitions(tools, {
			serverName: "fs-server",
			source: "stdio",
			sourcePath: "npx @mcp/fs",
		});

		expect(result).toHaveLength(3);
		expect(result.map((t) => t.name)).toEqual(["read", "write", "delete"]);
		expect(result.every((t) => t.serverName === "fs-server")).toBe(true);
	});

	it("returns empty array for empty tools list", () => {
		const result = mapToolsToDefinitions([], {
			serverName: "empty",
			source: "stdio",
			sourcePath: "node ./empty.js",
		});

		expect(result).toEqual([]);
	});

	it("defaults inputSchema to { type: 'object' } when missing", () => {
		const tools = [
			{
				name: "no-schema",
				inputSchema: undefined as unknown as Record<string, unknown>,
			},
		];

		const result = mapToolsToDefinitions(tools, {
			serverName: "test",
			source: "stdio",
			sourcePath: "cmd",
		});

		expect(result[0].inputSchema).toEqual({ type: "object" });
	});
});
