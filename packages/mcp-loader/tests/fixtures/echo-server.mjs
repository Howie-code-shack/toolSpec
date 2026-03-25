#!/usr/bin/env node
/**
 * Minimal MCP server for testing the stdio loader.
 *
 * Speaks MCP protocol over stdin/stdout using the official SDK.
 * Exposes two tools: "echo" and "add".
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
	name: "echo-test-server",
	version: "1.2.3",
});

server.tool(
	"echo",
	"Echoes back the input message unchanged.",
	{ message: z.string().describe("The message to echo back") },
	async ({ message }) => ({
		content: [{ type: "text", text: message }],
	}),
);

server.tool(
	"add",
	"Adds two numbers together and returns the sum.",
	{ a: z.number().describe("First number"), b: z.number().describe("Second number") },
	async ({ a, b }) => ({
		content: [{ type: "text", text: String(a + b) }],
	}),
);

const transport = new StdioServerTransport();
await server.connect(transport);
