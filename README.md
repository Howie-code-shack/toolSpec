# ToolSpec

**ESLint for MCP tools.** Lint, score, and fix MCP tool definitions before they reach production agents.

A 2025 study found **97.1% of MCP tool descriptions contain at least one quality defect** (Hasan et al., Queen's University, arXiv:2602.14878). Vague descriptions, missing parameter docs, and undocumented errors cause agents to pick the wrong tool, pass wrong parameters, and fail silently. ToolSpec catches these issues.

## Quick Start

```bash
npm install
npm run build

# Lint a tool definition file
node packages/cli/dist/index.js lint fixtures/demo-tools.json

# Or link the CLI globally
npm link --workspace=packages/cli
toolspec lint fixtures/demo-tools.json
```

### Example Output

```
ToolSpec — MCP Tool Quality Report

  demo-api-server
    search_documents
      ✖ TS001 Description is tautological — it just restates the tool name.
      ⚠ TS002 Has parameters suggesting constraints but description mentions none.
      ⚠ TS102 Property "query" has no description.
      ⚠ TS201 inputSchema is missing "additionalProperties": false.

  Scores
    Server           │ Score     │ Errors │ Warnings │ Info
    demo-api-server  │ 48.6/100  │ 3      │ 25       │ 4
```

## What It Checks

ToolSpec runs **14 rules** across three dimensions:

### Description Quality (TS001–TS006)

Are tool descriptions clear, complete, and actionable?

| Rule | Name | What It Flags |
|------|------|---------------|
| TS001 | `unclear-purpose` | Missing, short, tautological, or verb-less descriptions |
| TS002 | `unstated-limitations` | Constraint-suggesting params without documented limits |
| TS003 | `missing-usage-guidelines` | No when-to-use, differentiation, or workflow guidance |
| TS004 | `opaque-parameters` | Single-char, abbreviated, or undescribed parameter names |
| TS005 | `missing-examples` | No examples (scaled by schema complexity) |
| TS006 | `missing-error-guidance` | No output or error/failure documentation |

### Schema Structure (TS101–TS105)

Are input schemas well-typed, documented, and constrained?

| Rule | Name | What It Flags |
|------|------|---------------|
| TS101 | `schema-missing-type` | Properties without `type` declaration |
| TS102 | `schema-missing-description` | Properties without `description` |
| TS103 | `schema-unsupported-keywords` | `anyOf`/`oneOf`/`allOf` usage |
| TS104 | `schema-permissive-types` | Bare objects or untyped arrays |
| TS105 | `schema-missing-required` | Object schemas missing `required` array |

### Client Compatibility (TS201–TS203)

Will schemas work across OpenAI strict mode, Azure AI Foundry, and other clients?

| Rule | Name | What It Flags |
|------|------|---------------|
| TS201 | `compat-additional-properties` | Objects missing `additionalProperties: false` |
| TS202 | `compat-ref-usage` | `$ref` usage (unsupported in OpenAI strict mode) |
| TS203 | `compat-required-all` | Properties not listed in `required` array |

## Real-World Results

Even official MCP servers have room to improve:

| Server | Tools | Score |
|--------|-------|-------|
| MCP Filesystem Server | 14 | 63.5/100 |
| GitHub MCP Server | 16 | 58.9/100 |
| MCP Fetch Server | 1 | 57/100 |

## CLI Options

```bash
toolspec lint <file>                    # Lint with console output
toolspec lint <file> --format json      # JSON output
toolspec lint <file> --quiet            # Suppress output, exit code only
toolspec lint <file> --fail-on warning  # Fail on warnings (default: error)
```

**Exit codes:** `0` = pass, `1` = diagnostics found matching `--fail-on`, `2` = error.

## Project Structure

TypeScript monorepo using npm workspaces:

```
packages/core       → @toolspec/core   Pure analysis engine, zero I/O
packages/cli        → @toolspec/cli    CLI, file loaders, reporters
packages/mcp-loader → @toolspec/mcp-loader  MCP server loaders (Phase 2)
fixtures/           → Tool definition JSON files for testing
```

**Key design principle:** `@toolspec/core` is pure — no file system, no network, no side effects. It receives `ToolDefinition[]` and returns `AnalysisResult`. This makes the same engine usable in CLI, API, and MCP server contexts.

## Development

```bash
npm install              # Install dependencies
npm run build            # Build all packages
npm run test             # Run all tests (152 tests)
npm run typecheck        # Type-check all packages
npm run lint             # Biome lint + format check
```

### Adding a Rule

1. Create `packages/core/src/rules/tsXXX-rule-name.ts` implementing the `Rule` interface
2. Create `packages/core/src/rules/__tests__/tsXXX-rule-name.test.ts`
3. Register in `packages/core/src/rules/index.ts` → `BUILT_IN_RULES`
4. Run `npx vitest run`

Every rule is a pure function: `check(tool: ToolDefinition): Diagnostic[]`. Deterministic, no side effects, self-contained.

## Research Basis

> **"MCP Tool Descriptions Are Smelly!"** — Hasan et al., Queen's University, 2025 (arXiv:2602.14878)
>
> Studied 856 tools across 103 MCP servers. Found 97.1% contain at least one description smell. Augmenting descriptions improves agent task success by +5.85pp but increases execution steps by 67.5%.

The six smell categories map directly to rules TS001–TS006. Schema and compatibility rules (TS101–TS203) extend the taxonomy to cover structural and cross-client concerns.

## License

MIT
