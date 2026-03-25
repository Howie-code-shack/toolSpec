import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { loadFromStdio } from "../src/stdio-loader.js";

const ECHO_SERVER = `node ${resolve(import.meta.dirname, "fixtures/echo-server.mjs")}`;

describe("loadFromStdio", () => {
	it("connects to an MCP server and returns tool definitions", async () => {
		const tools = await loadFromStdio(ECHO_SERVER);

		expect(tools).toHaveLength(2);

		const echo = tools.find((t) => t.name === "echo");
		const add = tools.find((t) => t.name === "add");

		expect(echo).toBeDefined();
		expect(echo!.description).toBe("Echoes back the input message unchanged.");
		expect(echo!.inputSchema.type).toBe("object");
		expect(echo!.inputSchema.properties).toHaveProperty("message");

		expect(add).toBeDefined();
		expect(add!.description).toBe("Adds two numbers together and returns the sum.");
		expect(add!.inputSchema.properties).toHaveProperty("a");
		expect(add!.inputSchema.properties).toHaveProperty("b");
	}, 15_000);

	it("sets source metadata correctly", async () => {
		const tools = await loadFromStdio(ECHO_SERVER);

		for (const tool of tools) {
			expect(tool.source).toBe("stdio");
			expect(tool.sourcePath).toBe(ECHO_SERVER);
			expect(tool.serverName).toBe("echo-test-server");
			expect(tool.serverVersion).toBe("1.2.3");
		}
	}, 15_000);

	it("throws on empty command", async () => {
		await expect(loadFromStdio("")).rejects.toThrow("Command string cannot be empty");
	});

	it("throws on invalid command", async () => {
		await expect(
			loadFromStdio("nonexistent-binary-xyz", { timeoutMs: 5_000 }),
		).rejects.toThrow();
	}, 10_000);
});
