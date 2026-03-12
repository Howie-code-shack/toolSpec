# ToolSpec — MCP Tool Schema Governance & Quality Platform

## What This Is

ToolSpec is a developer-first CLI and library for linting, validating, and scoring MCP (Model Context Protocol) tool definitions. It catches quality issues in tool descriptions and schemas before they reach production agents.

## Project Structure

TypeScript monorepo using npm workspaces:

```
packages/core       → @toolspec/core (pure engine library, zero I/O)
packages/cli        → @toolspec/cli (Commander.js CLI, file loaders, reporters)
packages/mcp-loader → @toolspec/mcp-loader (MCP SDK client, stdio/HTTP loaders)
fixtures/           → Sample tool definition JSON files for testing
docs/               → Documentation (VitePress, future)
```

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

# Run the CLI locally (after build):
node packages/cli/dist/index.js lint fixtures/demo-tools.json

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

| Range    | Category                | Description                                    |
|----------|------------------------|------------------------------------------------|
| TS001–006 | Description quality    | Smell detection on natural-language descriptions |
| TS101–106 | Schema structural      | JSON Schema validity and best practices          |
| TS201–203 | Annotations & metadata | MCP-specific metadata completeness               |

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
