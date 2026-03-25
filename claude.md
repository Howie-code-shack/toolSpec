# ToolSpec — MCP Tool Schema Governance & Quality Platform

## What This Is

ToolSpec is a developer-first CLI and library for linting, validating, and scoring MCP (Model Context Protocol) tool definitions. It catches quality issues in tool descriptions and schemas before they reach production agents.

## Project Structure

TypeScript monorepo using npm workspaces:

```
packages/core       → @toolspec/core (pure engine library, zero I/O)
packages/cli        → @toolspec/cli (Commander.js CLI, file loaders, reporters)
packages/mcp-loader → @toolspec/mcp-loader (MCP SDK client, stdio/HTTP loaders — stub)
fixtures/           → Tool definition JSON files (hand-crafted + real MCP servers)
docs/               → Documentation and presentation materials
```

### Fixtures

| File | Source | Score | Purpose |
|------|--------|-------|---------|
| `demo-tools.json` | Hand-crafted | 48.6/100 | Mixed quality, original test fixture |
| `good-server.json` | Hand-crafted | 82.5/100 | Demo: what good looks like |
| `bad-server.json` | Hand-crafted | 0/100 | Demo: what bad looks like |
| `mcp-filesystem-server.json` | Official MCP repo | 63.5/100 | Real-world: 14 tools |
| `mcp-github-server.json` | GitHub MCP server | 58.9/100 | Real-world: 16 tools |
| `mcp-fetch-server.json` | Official MCP repo | 57/100 | Real-world: 1 tool |

## Key Architecture Decisions

- **@toolspec/core is pure.** No I/O, no network, no file system. It receives `ToolDefinition[]` and returns `AnalysisResult`. This ensures the same engine works in CLI, SaaS API, and as an MCP server.
- **Rules are pure functions.** Each rule: `(tool: ToolDefinition) => Diagnostic[]`. Deterministic, no side effects. Every rule lives in `packages/core/src/rules/` with tests in `__tests__/` adjacent.
- **Loaders handle I/O.** File loading is in `@toolspec/cli`. MCP server loading is in `@toolspec/mcp-loader`. The core never touches I/O.
- **Reporters format output.** Console, JSON, SARIF, HTML — all in `packages/cli/src/reporters/`.

## Conventions

### Code Style
- Biome for linting and formatting (not ESLint/Prettier)
- Tabs for indentation, double quotes, semicolons always
- Use `import type` for type-only imports
- Prefer `interface` over `type` for object shapes
- Prefer named exports; no default exports except in config files

### TypeScript
- Target: ES2022, module: Node16, moduleResolution: Node16
- Strict mode always
- Use `.js` extensions in relative imports (required for Node16 module resolution)
- Build with tsup (esbuild-based), outputs ESM only

### Testing
- Vitest for all tests
- Tests adjacent to source: `src/rules/__tests__/ts001-unclear-purpose.test.ts`
- Integration tests in `packages/*/tests/`
- Use `describe` / `it` pattern
- Helper function `makeTool()` for creating test fixtures

### Naming
- Rule IDs: `TS` + 3-digit number (TS001, TS101, TS201)
- Rule files: `ts001-unclear-purpose.ts` (lowercase, kebab-case)
- Test files: `ts001-unclear-purpose.test.ts`
- Categories: `SmellCategory` type (e.g. "unclear-purpose", "opaque-parameters")

### Git
- Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`
- One logical change per commit
- Branch naming: `feat/ts002-unstated-limitations`, `fix/scoring-edge-case`

## Commands

```bash
npm install              # Install all workspace dependencies
npm run build            # Build all packages (tsup)
npm run test             # Run all tests (vitest)
npm run typecheck        # Type-check all packages (tsc --build)
npm run lint             # Lint/format check (biome)

# Run the CLI (after build + npm link --workspace=packages/cli):
toolspec lint fixtures/demo-tools.json
toolspec lint fixtures/demo-tools.json --format json
toolspec lint fixtures/demo-tools.json --quiet

# Or without linking:
node packages/cli/dist/index.js lint fixtures/demo-tools.json

# Demo scripts:
npm run lint:demo        # demo-tools.json (mixed quality)
npm run lint:demo:good   # good-server.json (82.5/100)
npm run lint:demo:bad    # bad-server.json (0/100)

# Run a specific test file:
npx vitest run packages/core/src/rules/__tests__/ts001-unclear-purpose.test.ts
```

## Adding a New Rule

1. Create `packages/core/src/rules/tsXXX-rule-name.ts`
2. Implement the `Rule` interface: `meta` object + `check(tool)` function
3. Create `packages/core/src/rules/__tests__/tsXXX-rule-name.test.ts`
4. Add fixtures that cover pass/fail cases
5. Register the rule in `packages/core/src/rules/index.ts` → `BUILT_IN_RULES` array
6. Run tests: `npx vitest run`

## Rule Categories

| Range     | Category             | Description                                      |
|-----------|----------------------|--------------------------------------------------|
| TS001–006 | Description quality  | Smell detection on natural-language descriptions |
| TS101–105 | Schema structural    | JSON Schema validity and best practices          |
| TS201–203 | Client compatibility   | Cross-client schema compat (OpenAI strict, Azure AI Foundry) |

### Implemented Rules

**Description quality (all implemented):**
- TS001 `unclear-purpose` — missing, short, tautological, or verb-less descriptions
- TS002 `unstated-limitations` — constraint-suggesting params without documented limits
- TS003 `missing-usage-guidelines` — no when-to-use, differentiation, or workflow guidance
- TS004 `opaque-parameters` — single-char, abbreviated, or undescribed parameter names
- TS005 `missing-examples` — no examples (scaled by schema complexity)
- TS006 `missing-error-guidance` — no output or error/failure documentation

**Schema structural (all implemented):**
- TS101 `schema-missing-type` — properties without `type` (breaks Azure Foundry, OpenAI strict)
- TS102 `schema-missing-description` — properties without `description`
- TS103 `schema-unsupported-keywords` — `anyOf`/`oneOf`/`allOf` usage
- TS104 `schema-permissive-types` — bare objects or untyped arrays
- TS105 `schema-missing-required` — object schemas with properties but no `required` array

**Client compatibility (all implemented):**
- TS201 `compat-additional-properties` — objects missing `additionalProperties: false` (OpenAI strict)
- TS202 `compat-ref-usage` — `$ref` usage unsupported in OpenAI strict mode
- TS203 `compat-required-all` — properties not listed in `required` array (OpenAI strict)

## Dependencies

| Package                        | Purpose                                    |
|-------------------------------|-------------------------------------------|
| ajv + ajv-formats             | JSON Schema validation (draft-2020-12)     |
| commander                     | CLI argument parsing                       |
| chalk                         | Terminal colours                           |
| cli-table3                    | Terminal tables                            |
| @modelcontextprotocol/sdk     | MCP client (mcp-loader package, Phase 2)   |
| vitest                        | Testing                                    |
| tsup                          | Building                                   |
| @biomejs/biome                | Linting + formatting                       |

## Research Basis

The smell taxonomy and quality rubric are derived from:

> **"MCP Tool Descriptions Are Smelly!"** — Hasan et al., Queen's University, 2025 (arXiv:2602.14878)
>
> Studied 856 tools across 103 MCP servers. Found 97.1% contain at least one description smell.
> Augmenting descriptions improves agent task success by +5.85pp but increases execution steps by 67.5%.

The six smell categories (unclear purpose, unstated limitations, missing usage guidelines, opaque parameters, missing examples, undocumented output) map directly to rules TS001–TS006.
