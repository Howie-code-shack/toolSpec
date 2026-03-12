# Architecture Rules — ToolSpec-specific Invariants

These rules capture the non-negotiable constraints of this codebase. Violating them breaks the separation that makes ToolSpec work across CLI, SaaS API, and MCP server contexts.

## The Core Purity Rule (most important)

**`@toolspec/core` must never perform I/O.**

- No `fs`, no `fetch`, no `child_process`, no `process.env` reads, no network calls.
- It receives `ToolDefinition[]` and returns `AnalysisResult`. That's it.
- File loading belongs in `@toolspec/cli`. MCP server loading belongs in `@toolspec/mcp-loader`.
- If you find yourself importing a Node built-in inside `packages/core/src/`, stop — you're in the wrong package.

## Rules Are Pure Functions

Every lint rule must be:
- **Deterministic** — same input always produces the same diagnostics.
- **Side-effect-free** — no logging, no network, no mutation of shared state.
- **Self-contained** — one file per rule; no cross-rule dependencies.

The interface is: `check(tool: ToolDefinition): Diagnostic[]`. Keep it that way.

## Rule ID Scheme

| Range | Category | Examples |
|-------|----------|---------|
| TS001–TS006 | Description quality smells | unclear-purpose, missing-examples |
| TS101–TS106 | Schema structural | missing-type, missing-required |
| TS201–TS203 | Annotations & metadata | missing-title, missing-hints |

- Never reuse a retired ID.
- Register every new rule in `packages/core/src/rules/index.ts` → `BUILT_IN_RULES`.

## Test Fixtures — Use `makeTool()`

All rule unit tests must use the `makeTool()` helper, not hand-rolled `ToolDefinition` objects. This keeps fixtures minimal and stable if the type evolves.

```ts
// Good
const tool = makeTool({ name: "search", description: "Searches documents." });

// Bad — brittle, verbose, breaks if ToolDefinition grows
const tool: ToolDefinition = { name: "search", description: "...", inputSchema: { type: "object" }, source: "file", serverName: "test" };
```

## Package Responsibilities Summary

| Package | Allowed to do | Must NOT do |
|---------|--------------|-------------|
| `@toolspec/core` | Run rules, score, produce `AnalysisResult` | I/O, network, file system |
| `@toolspec/cli` | Load files, parse args, render output | Contain rule logic |
| `@toolspec/mcp-loader` | Connect to MCP servers via stdio/HTTP | Contain rule logic |
