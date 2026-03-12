# ToolSpec — Development Plan

## MCP Tool Schema Governance, Linting & Discovery Platform

---

## Vision

ToolSpec is a developer-first platform for ensuring MCP tool descriptions and schemas are high-quality, compatible, and governed at enterprise scale. It starts as a CLI linter developers love, grows into a platform teams depend on, and becomes an ecosystem layer the MCP community builds around.

**Tagline:** *"ESLint for MCP Tools"*

---

## Product Phases

### Phase 1 — CLI Tool (Developer Adoption)
Free, open-source CLI. The wedge that gets ToolSpec into every MCP developer's workflow.

### Phase 2 — Platform SaaS (Team/Enterprise Value)
Paid platform for teams managing tool estates at scale. Continuous monitoring, drift detection, governance workflows.

### Phase 3 — Ecosystem & API Play (Network Effects)
Public quality index, MCP server that agents call directly, integration with the official MCP Registry and gateways like Kong.

---

## Phase 1 — ToolSpec CLI

### What It Does

A CLI tool that connects to any MCP server (local or remote), introspects its tool definitions, and produces a quality report covering:

1. **Description Quality Linting** — Scans tool descriptions against a rubric derived from the six known smell categories:
   - **Unclear Purpose** — Does the description explain what the tool does?
   - **Unstated Limitations** — Are constraints, rate limits, or failure modes documented?
   - **Missing Usage Guidelines** — Does it explain when/how to use the tool?
   - **Opaque Parameters** — Are parameter names and descriptions clear to an LLM?
   - **Missing Examples** — Are usage examples provided where helpful?
   - **Undocumented Output** — Is the return shape/content described?

2. **Schema Validation** — Validates `inputSchema` against JSON Schema draft 2020-12, checks for common issues:
   - Missing `type` on properties (breaks Azure Foundry, OpenAI strict mode)
   - Use of `anyOf`/`oneOf` (unsupported by some clients)
   - Missing `required` array
   - Missing `description` on properties
   - Overly permissive types (`type: "object"` with no properties defined)

3. **Client Compatibility Matrix** — Tests schema against known constraints of major MCP clients:
   - Claude (Anthropic)
   - OpenAI / GPT (strict function calling mode)
   - Azure AI Foundry
   - Cursor / Windsurf / VS Code Copilot
   - LangChain / LangGraph

4. **Suggested Fixes** — For each issue found, provides an actionable suggestion. For description smells, offers an AI-augmented rewrite (optional, requires API key).

5. **Scoring** — Produces a composite quality score (0–100) per tool, with breakdown by category. Aggregate score for the server.

### CLI Interface Design

```bash
# Scan a local MCP server via stdio
toolspec lint --stdio "node ./my-mcp-server/build/index.js"

# Scan a remote MCP server via Streamable HTTP
toolspec lint --url https://mcp.example.com/sse

# Scan from a tool definitions JSON file (for CI pipelines)
toolspec lint --file ./tools.json

# Output formats
toolspec lint --stdio "..." --format table      # default, human-readable
toolspec lint --stdio "..." --format json       # machine-readable for CI
toolspec lint --stdio "..." --format sarif      # GitHub code scanning integration
toolspec lint --stdio "..." --format markdown   # for PRs / documentation

# AI-augmented suggestions (requires ANTHROPIC_API_KEY or OPENAI_API_KEY)
toolspec lint --stdio "..." --fix-suggestions

# Filter by severity
toolspec lint --stdio "..." --min-severity warning

# Check compatibility with specific clients only
toolspec lint --stdio "..." --clients claude,openai,azure-foundry

# Configuration file (for project-level settings)
toolspec lint --config .toolspec.yml

# Initialise a config file
toolspec init
```

### Configuration File (.toolspec.yml)

```yaml
# .toolspec.yml
version: 1

# How to connect to the MCP server for scanning
server:
  transport: stdio
  command: "node ./build/index.js"
  # OR
  # transport: http
  # url: https://mcp.example.com/sse

# Rule configuration
rules:
  unclear-purpose:
    severity: error          # error | warning | info
  unstated-limitations:
    severity: warning
  missing-usage-guidelines:
    severity: warning
  opaque-parameters:
    severity: error
  missing-examples:
    severity: info
  undocumented-output:
    severity: warning

  # Schema rules
  schema-missing-type:
    severity: error
  schema-missing-description:
    severity: warning
  schema-unsupported-keywords:
    severity: error
    options:
      clients: [claude, openai, azure-foundry]

# Tools to exclude from scanning
exclude:
  - internal_debug_tool
  - deprecated_*

# AI suggestions configuration
suggestions:
  enabled: false              # requires API key in env
  provider: anthropic         # anthropic | openai
  model: claude-sonnet-4-20250514

# Output
output:
  format: table
  min-severity: warning
```

### Example CLI Output

```
 ToolSpec v0.1.0 — MCP Tool Quality Report
 Server: my-analytics-server (stdio)
 Tools scanned: 12 | Issues found: 23

 ──────────────────────────────────────────────────────
 Tool: search_documents
 Score: 42/100
 ──────────────────────────────────────────────────────

  ERROR  unclear-purpose
    Description "Search documents" does not explain what kind
    of documents, what search method is used, or what is returned.
    ▸ Suggestion: "Search indexed PDF and Markdown documents by
      keyword or semantic query. Returns matching excerpts with
      page references and relevance scores."

  ERROR  opaque-parameters
    Parameter "q" has no description and uses a non-obvious name.
    ▸ Suggestion: Rename to "query" with description "The search
      term or natural language query to match against documents."

  WARNING  schema-unsupported-keywords
    inputSchema uses "anyOf" on parameter "format" — unsupported
    by Azure AI Foundry. Tool will fail at invocation time.
    ▸ Affected clients: Azure AI Foundry
    ▸ Suggestion: Replace anyOf with an enum of allowed values.

  WARNING  undocumented-output
    No output description provided. The LLM won't know what
    shape of data to expect from this tool.

 ──────────────────────────────────────────────────────
 Tool: get_user_profile
 Score: 87/100
 ──────────────────────────────────────────────────────

  INFO  missing-examples
    Consider adding a usage example to help LLMs understand
    when to select this tool over similar alternatives.

 ──────────────────────────────────────────────────────

 Summary
 ─────────────────────────────────────
 Server Score:  64/100
 Tools passing: 7/12 (58%)

  3 errors · 12 warnings · 8 info

 Run with --fix-suggestions for AI-powered rewrites
```

---

## Technical Architecture — Phase 1 (CLI)

### Software Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Language** | TypeScript | MCP ecosystem is TS-first; your WSL2/VS Code env; Claude Code native |
| **Runtime** | Node.js 22+ | LTS, built-in type stripping for dev, MCP SDK requires it |
| **CLI Framework** | `commander` + `chalk` + `ora` | Battle-tested, lightweight, good DX |
| **MCP Client** | `@modelcontextprotocol/client` | Official SDK for connecting to servers and listing tools |
| **Schema Validation** | `ajv` (JSON Schema) + custom rules | Industry standard validator with excellent error reporting |
| **Description Analysis** | Custom rule engine + optional LLM | Rule-based scoring with optional AI augmentation |
| **LLM Integration** | Anthropic SDK (`@anthropic-ai/sdk`) | For `--fix-suggestions` mode; optional dependency |
| **Output Formatting** | Custom renderers (table, JSON, SARIF, MD) | SARIF for GitHub integration is key for CI adoption |
| **Testing** | `vitest` | Fast, TypeScript-native, good VSCode integration |
| **Build** | `tsup` (esbuild wrapper) | Fast bundling to single executable, tree-shaking |
| **Package Manager** | `npm` | Widest reach for `npx toolspec lint` usage |
| **Linting/Format** | `biome` | Fast, single tool for lint + format, replaces ESLint + Prettier |

### Project Structure

```
toolspec/
├── CLAUDE.md                    # Claude Code project instructions
├── package.json
├── tsconfig.json
├── biome.json
├── vitest.config.ts
├── .toolspec.yml                # Dogfooding: ToolSpec's own config
│
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── cli/
│   │   ├── commands/
│   │   │   ├── lint.ts          # Main lint command
│   │   │   └── init.ts         # Config file generator
│   │   ├── output/
│   │   │   ├── table.ts         # Terminal table renderer
│   │   │   ├── json.ts          # JSON output
│   │   │   ├── sarif.ts         # SARIF for GitHub code scanning
│   │   │   └── markdown.ts      # Markdown for PR comments
│   │   └── config.ts            # .toolspec.yml loader + validation
│   │
│   ├── core/
│   │   ├── scanner.ts           # Orchestrates scanning pipeline
│   │   ├── scoring.ts           # Computes quality scores
│   │   └── types.ts             # Shared type definitions
│   │
│   ├── connectors/
│   │   ├── stdio.ts             # Connect to MCP server via stdio
│   │   ├── http.ts              # Connect via Streamable HTTP / SSE
│   │   └── file.ts              # Load tool defs from JSON file
│   │
│   ├── rules/
│   │   ├── engine.ts            # Rule execution engine
│   │   ├── registry.ts          # Rule registration + configuration
│   │   │
│   │   ├── description/         # Description quality rules
│   │   │   ├── unclear-purpose.ts
│   │   │   ├── unstated-limitations.ts
│   │   │   ├── missing-usage-guidelines.ts
│   │   │   ├── opaque-parameters.ts
│   │   │   ├── missing-examples.ts
│   │   │   └── undocumented-output.ts
│   │   │
│   │   ├── schema/              # Schema validation rules
│   │   │   ├── missing-type.ts
│   │   │   ├── missing-description.ts
│   │   │   ├── unsupported-keywords.ts
│   │   │   ├── permissive-types.ts
│   │   │   └── missing-required.ts
│   │   │
│   │   └── compatibility/       # Client compatibility rules
│   │       ├── claude.ts
│   │       ├── openai.ts
│   │       ├── azure-foundry.ts
│   │       ├── cursor.ts
│   │       └── langchain.ts
│   │
│   ├── suggestions/
│   │   ├── provider.ts          # LLM suggestion interface
│   │   ├── anthropic.ts         # Anthropic API integration
│   │   └── prompts.ts           # Prompt templates for rewrites
│   │
│   └── utils/
│       ├── logger.ts
│       └── schema-helpers.ts
│
├── test/
│   ├── fixtures/                # Sample MCP tool definitions
│   │   ├── good-tools.json
│   │   ├── smelly-tools.json
│   │   └── incompatible-schemas.json
│   ├── rules/
│   │   ├── description/
│   │   └── schema/
│   ├── connectors/
│   └── integration/
│
└── docs/
    ├── rules.md                 # Rule documentation
    └── contributing.md
```

### Core Data Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  MCP Server   │     │   Connector   │     │   Scanner     │
│  (stdio/http) │────►│  (introspect  │────►│  (orchestrate │
│  or JSON file │     │   tools/list) │     │   rule checks)│
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┼────────────────────┐
                     │                            │                    │
              ┌──────▼──────┐  ┌─────────────────▼──┐  ┌─────────────▼────┐
              │ Description  │  │ Schema Validation   │  │ Compatibility     │
              │ Rules        │  │ Rules               │  │ Rules             │
              │ (6 smells)   │  │ (JSON Schema +      │  │ (client matrix)   │
              │              │  │  structural checks)  │  │                   │
              └──────┬───────┘  └─────────┬───────────┘  └────────┬──────────┘
                     │                    │                        │
                     └────────────┬───────┘────────────────────────┘
                                  │
                           ┌──────▼──────┐
                           │   Scorer     │
                           │  (aggregate  │
                           │   + weight)  │
                           └──────┬──────┘
                                  │
                    ┌─────────────┼──────────────┐
                    │             │              │
             ┌──────▼──┐  ┌──────▼──┐   ┌──────▼────┐
             │  Table   │  │  JSON   │   │  SARIF    │
             │ Renderer │  │ Output  │   │  Output   │
             └──────────┘  └─────────┘   └───────────┘
```

### Key Type Definitions

```typescript
// src/core/types.ts

/** A tool definition as retrieved from an MCP server */
interface McpToolDefinition {
  name: string;
  description?: string;
  inputSchema: JsonSchema;
  outputSchema?: JsonSchema;
  annotations?: Record<string, unknown>;
}

/** Result of scanning a single tool */
interface ToolReport {
  toolName: string;
  score: number;                  // 0-100
  issues: Issue[];
  suggestions?: Suggestion[];
}

/** A single issue found by a rule */
interface Issue {
  ruleId: string;                 // e.g. "unclear-purpose"
  category: 'description' | 'schema' | 'compatibility';
  severity: 'error' | 'warning' | 'info';
  message: string;
  detail?: string;
  affectedClients?: string[];     // for compatibility rules
  location?: {
    field: string;                // e.g. "description", "inputSchema.properties.q"
  };
}

/** An AI-generated suggestion for fixing an issue */
interface Suggestion {
  ruleId: string;
  original: string;
  suggested: string;
  explanation: string;
  tokenImpact?: {
    originalTokens: number;
    suggestedTokens: number;
  };
}

/** Overall server report */
interface ServerReport {
  serverName: string;
  transport: 'stdio' | 'http' | 'file';
  timestamp: string;
  toolCount: number;
  overallScore: number;
  tools: ToolReport[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    passingTools: number;
  };
}

/** Rule interface — all rules implement this */
interface Rule {
  id: string;
  category: 'description' | 'schema' | 'compatibility';
  defaultSeverity: 'error' | 'warning' | 'info';
  name: string;
  docs: string;                   // URL to rule documentation
  check(tool: McpToolDefinition, config?: RuleConfig): Issue[];
}
```

---

## CLAUDE.md — Claude Code Project Instructions

```markdown
# ToolSpec — Claude Code Instructions

## Project Overview
ToolSpec is a CLI tool that lints MCP (Model Context Protocol) tool
definitions for quality, schema validity, and client compatibility.
Think of it as "ESLint for MCP Tools".

## Tech Stack
- TypeScript on Node.js 22+
- CLI: commander + chalk + ora
- MCP: @modelcontextprotocol/client SDK
- Schema: ajv for JSON Schema validation
- Testing: vitest
- Build: tsup
- Linting: biome

## Architecture Principles
- Each rule is a self-contained module in src/rules/
- Rules implement the Rule interface from src/core/types.ts
- The scanner orchestrates: connect → introspect → run rules → score → output
- Connectors abstract transport (stdio, http, file)
- Output renderers are pluggable (table, json, sarif, markdown)

## Key Conventions
- Use Zod for runtime validation of config files and CLI inputs
- All async operations use async/await (no callbacks)
- Errors should be user-friendly with actionable messages
- Every rule must have corresponding tests in test/rules/
- Test fixtures go in test/fixtures/ as JSON tool definitions
- No classes unless genuinely needed; prefer functions + types

## Development Commands
- `npm run dev` — run CLI in development mode
- `npm test` — run vitest
- `npm run build` — bundle with tsup
- `npm run lint` — biome check
- `npm run typecheck` — tsc --noEmit

## File Naming
- Kebab-case for files: `unclear-purpose.ts`
- PascalCase for types/interfaces: `ToolReport`
- camelCase for functions/variables: `checkUnclearPurpose`

## Important Context
- The MCP tool description quality problem is well-documented:
  97.1% of MCP tool descriptions contain at least one "smell"
- Six smell categories: Unclear Purpose, Unstated Limitations,
  Missing Usage Guidelines, Opaque Parameters, Missing Examples,
  Undocumented Output
- Different MCP clients (Claude, OpenAI, Azure Foundry) support
  different subsets of JSON Schema — compatibility testing matters
- The CLI must work in CI/CD pipelines (exit codes, SARIF output)
```

---

## Phase 1 — Development Milestones

### Milestone 1: Scaffold & Core Pipeline (Week 1-2)

**Goal:** CLI runs, connects to an MCP server, lists tools, outputs raw data.

- [ ] Initialise project (package.json, tsconfig, biome, vitest)
- [ ] Set up CLAUDE.md with project context
- [ ] Implement CLI entry point with commander
- [ ] Build stdio connector using MCP client SDK
- [ ] Build file connector (load tools from JSON)
- [ ] Implement scanner orchestration (connect → list tools → pass to rules)
- [ ] Create type definitions (types.ts)
- [ ] Basic table output renderer
- [ ] JSON output renderer
- [ ] First passing test: scan a fixture file and get a report

### Milestone 2: Description Quality Rules (Week 2-3)

**Goal:** All six description smell rules working with tests.

- [ ] Rule engine with registration and config override
- [ ] Rule: `unclear-purpose` — checks description length, verb presence, specificity
- [ ] Rule: `unstated-limitations` — checks for constraint/limit language
- [ ] Rule: `missing-usage-guidelines` — checks for when/how guidance
- [ ] Rule: `opaque-parameters` — checks param names and descriptions
- [ ] Rule: `missing-examples` — checks for example patterns in description
- [ ] Rule: `undocumented-output` — checks for output description or outputSchema
- [ ] Comprehensive test fixtures (good tools, smelly tools)
- [ ] Scoring algorithm (weighted average across categories)

### Milestone 3: Schema Validation Rules (Week 3-4)

**Goal:** Schema structural checks working, catching real-world breakage.

- [ ] Rule: `schema-missing-type` — properties without type declaration
- [ ] Rule: `schema-missing-description` — properties without descriptions
- [ ] Rule: `schema-unsupported-keywords` — anyOf/oneOf/allOf in contexts clients reject
- [ ] Rule: `schema-permissive-types` — overly broad types (bare object, any)
- [ ] Rule: `schema-missing-required` — no required array when properties exist
- [ ] Integrate ajv for base JSON Schema validation
- [ ] Test against real-world problematic schemas (Azure Foundry, OpenAI strict mode)

### Milestone 4: Client Compatibility Rules (Week 4-5)

**Goal:** Compatibility matrix working for major clients.

- [ ] Define client constraint profiles (what each client does/doesn't support)
- [ ] Rule: `compat-claude` — Anthropic tool calling constraints
- [ ] Rule: `compat-openai` — OpenAI strict function calling constraints
- [ ] Rule: `compat-azure-foundry` — Azure Foundry's restricted schema subset
- [ ] Rule: `compat-cursor` — Cursor/Windsurf constraints
- [ ] Rule: `compat-langchain` — LangChain/LangGraph Zod conversion issues
- [ ] `--clients` flag to select which clients to check
- [ ] Compatibility section in report output

### Milestone 5: AI Suggestions & Polish (Week 5-6)

**Goal:** Optional AI-powered fix suggestions, config file, CI integration.

- [ ] Anthropic SDK integration for `--fix-suggestions`
- [ ] Prompt engineering for description rewrites (with token impact analysis)
- [ ] `.toolspec.yml` config file loader (Zod-validated)
- [ ] `toolspec init` command
- [ ] SARIF output renderer (for GitHub code scanning)
- [ ] Markdown output renderer (for PR comments)
- [ ] HTTP connector (Streamable HTTP / SSE transport)
- [ ] Exit codes (0 = pass, 1 = errors found, 2 = scan failure)
- [ ] `--min-severity` filtering
- [ ] `--exclude` tool filtering

### Milestone 6: Package & Launch (Week 6-7)

**Goal:** Published to npm, documented, dogfooded.

- [ ] tsup build configuration (single-file bundle)
- [ ] npm package configuration (bin entry, engines)
- [ ] Test `npx toolspec lint` flow
- [ ] README with usage examples, rule documentation
- [ ] GitHub Actions workflow for CI on the project itself
- [ ] Example GitHub Action for users to add to their MCP server repos
- [ ] Dogfood: scan 10+ popular community MCP servers, publish results
- [ ] Publish to npm as `toolspec`

---

## Phase 2 — Platform SaaS (Outline)

Built after Phase 1 gains traction and validates demand.

### Additional Stack
- **API:** Hono on Cloudflare Workers (or Fastify on AKS given your Azure context)
- **Database:** PostgreSQL (Neon serverless or Azure Database)
- **Auth:** Clerk or WorkOS (developer-focused auth)
- **Queue:** Inngest or BullMQ (for async scanning jobs)
- **Frontend:** Next.js 15 + shadcn/ui + Tailwind (aligns with your SPA stack work)
- **Hosting:** Vercel (frontend) + Azure AKS (API/workers)

### Features
- **Dashboard:** Per-server quality scores, trends over time, team views
- **Continuous Monitoring:** Scheduled scans of registered MCP servers
- **Drift Detection:** Alert when tool descriptions change between scans
- **Semantic Deduplication:** Flag overlapping tools across servers
- **Governance Workflows:** Approval gates for tool description changes
- **Team Management:** Role-based access, server ownership assignment
- **API:** RESTful API for programmatic access to scan results
- **Integrations:** GitHub App (auto-scan on PR), Slack notifications
- **Usage Analytics:** Correlate quality scores with tool invocation success rates (requires integration with observability data)

### Business Model
- **Free:** CLI (always free, open source)
- **Team:** £49/month — 10 servers, continuous monitoring, dashboard
- **Enterprise:** £249/month — unlimited servers, governance, SSO, audit logs
- (Pricing is illustrative; validate with early users)

---

## Phase 3 — Ecosystem & API Play (Outline)

### MCP Server (ToolSpec-as-a-Tool)
An MCP server that agents can call to validate tools or discover high-quality tools:

```
toolspec-mcp-server exposes:
  - validate_tool(name, description, inputSchema) → quality report
  - search_tools(query, min_score) → matching tools from public index
  - get_compatibility(inputSchema, client) → compatibility report
```

This lets AI agents self-check their tool definitions or discover better alternatives — a meta-tool for the MCP ecosystem.

### Public Quality Index
- Scan all servers in the official MCP Registry nightly
- Publish quality scores publicly (like Snyk for npm packages)
- Badge system: "ToolSpec Score: 92/100" for README files
- Drives CLI adoption (developers want to improve their scores)

### Registry Integration
- Kong Konnect integration (quality overlay for their MCP Registry)
- Official MCP Registry integration (quality metadata in server listings)
- MuleSoft Agent Registry connector
- API for third-party registry integration

---

## Getting Started with Claude Code

### Initial Setup Commands

```bash
# Create project
mkdir toolspec && cd toolspec
git init

# Initialise Node project
npm init -y

# Install core dependencies
npm install commander chalk ora zod yaml ajv ajv-formats
npm install @modelcontextprotocol/client

# Install dev dependencies
npm install -D typescript tsup vitest @types/node biome
npm install -D @anthropic-ai/sdk  # for suggestion feature

# Initialise TypeScript
npx tsc --init

# Initialise Biome
npx biome init

# Create CLAUDE.md
# (paste the CLAUDE.md content from above)

# Create project structure
mkdir -p src/{cli/commands,cli/output,core,connectors,rules/{description,schema,compatibility},suggestions,utils}
mkdir -p test/{fixtures,rules/{description,schema},connectors,integration}
mkdir -p docs
```

### First Claude Code Session

Open the project in Claude Code and start with:

```
Read CLAUDE.md, then implement Milestone 1. Start with the type 
definitions in src/core/types.ts, then build the CLI entry point 
and the file connector. Create a test fixture with sample good 
and bad tool definitions, and write the scanner that runs rules 
against them. Use vitest for tests.
```

### Iterative Development Pattern

For each milestone, prompt Claude Code with:

```
Read CLAUDE.md. We're working on Milestone N. Here's what's done:
[list completed items]. Next, implement [specific rule/feature].
Write tests first, then implementation. Run tests to verify.
```

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| MCP spec changes break connector | High | Pin SDK version; watch MCP changelog; abstract behind connector interface |
| Client compatibility profiles go stale | Medium | Version profiles; community contribution model; automated testing against real clients |
| AI suggestion costs too high | Low | Optional feature; cache common patterns; use Haiku for cost efficiency |
| Kong/others build equivalent | Medium | Speed to market; open-source community; deeper quality analysis vs. their governance focus |
| npm name `toolspec` taken | Low | Check availability; alternatives: `mcp-toolspec`, `@toolspec/cli` |
| Low adoption | High | Dogfood against popular servers; publish compelling quality reports; developer blog posts |

---

## Success Metrics

### Phase 1 (3 months post-launch)
- 500+ npm installs/week
- 50+ GitHub stars
- 10+ community MCP servers scanned publicly
- 3+ blog posts / conference mentions

### Phase 2 (6 months post-launch)
- 20+ paying team accounts
- Integration with 1+ major gateway (Kong or MuleSoft)
- GitHub App installed on 50+ repositories

### Phase 3 (12 months post-launch)
- Public quality index covering 500+ MCP servers
- ToolSpec MCP server used by 100+ agents
- Partnership with MCP Registry for quality metadata
