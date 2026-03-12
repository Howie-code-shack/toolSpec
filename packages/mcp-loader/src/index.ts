/**
 * @toolspec/mcp-loader
 *
 * This package will provide loaders that connect to live MCP servers
 * via stdio and Streamable HTTP transports, extract tool definitions
 * using the tools/list method, and return them as ToolDefinition[].
 *
 * Phase 2 implementation will use @modelcontextprotocol/sdk Client.
 */

export { loadFromStdio } from "./stdio-loader.js";
