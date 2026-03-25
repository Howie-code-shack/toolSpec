# ToolSpec — ESLint for MCP Tools

## The Problem

MCP tool descriptions are the **only interface** between an AI agent and external capabilities. When a tool's description is vague, its parameters unnamed, or its errors undocumented, the agent guesses — and guesses wrong.

A 2025 study by researchers at Queen's University (Hasan et al., arXiv:2602.14878) analysed **856 tools across 103 MCP servers** and found:

> **97.1% of MCP tool descriptions contain at least one quality "smell".**

56% fail to clearly state what the tool even does. The remaining smells — unstated limitations, missing usage guidelines, opaque parameters, missing examples, and undocumented outputs — compound the problem. Agents pick the wrong tool, pass wrong parameters, and can't recover from errors they weren't told about.

Augmenting descriptions improves task success rates by **+5.85 percentage points** and partial goal completion by **+15.12%** — but at a cost: execution steps increase by 67.5% when descriptions are too verbose. Quality matters more than quantity.

## The Six Smell Categories

The academic taxonomy defines six categories of tool description defects:

| Smell | What's Missing | Impact on Agent |
|-------|---------------|-----------------|
| **Unclear Purpose** | What the tool does | Agent can't decide when to use it |
| **Unstated Limitations** | Rate limits, constraints, failure modes | Agent hits walls it can't diagnose |
| **Missing Usage Guidelines** | When to use, how it relates to other tools | Agent picks wrong tool from similar options |
| **Opaque Parameters** | Parameter names/descriptions | Agent guesses input values |
| **Missing Examples** | Usage patterns, sample inputs | Agent doesn't know expected format |
| **Undocumented Output** | Return shape, error behaviour | Agent can't process results or handle failures |

## What ToolSpec Does

ToolSpec is a **CLI linter** with **14 rules** that scans MCP tool definitions and produces a quality report. Think of it as ESLint for tool descriptions — it catches problems before they reach production agents.

**Input:** Tool definitions (JSON file)
**Output:** Per-tool quality score (0–100), actionable diagnostics, fix suggestions

### It checks three dimensions:

1. **Description Quality** (TS001–TS006) — Are descriptions clear, complete, and actionable?
2. **Schema Structure** (TS101–TS105) — Are input schemas well-typed, documented, and constrained?
3. **Client Compatibility** (TS201–TS203) — Will schemas work across OpenAI strict mode, Azure Foundry, and other clients?

### Design principles:

- **Pure analysis engine** — deterministic, no side effects, same input always produces same output
- **Rules are functions** — each rule is self-contained, testable, and configurable
- **Actionable output** — every diagnostic includes a concrete suggestion
- **CI-ready** — JSON output format, exit codes, severity filtering

## Real-World Results

Even official MCP servers from Anthropic and GitHub score well below 100:

| Server | Tools | Score | Key Issues |
|--------|-------|-------|------------|
| MCP Filesystem Server | 14 | 63.5/100 | Missing param descriptions, no usage guidelines, compat gaps |
| GitHub MCP Server | 16 | 58.9/100 | No return value docs, no error guidance, missing additionalProperties |
| MCP Fetch Server | 1 | 57/100 | Undocumented constraints, no output description, compat issues |

If the official reference servers have room to improve, every MCP server does.

---

*ToolSpec v0.1.0 — Open source, MIT licensed*
*Research: "MCP Tool Descriptions Are Smelly!" — Hasan et al., Queen's University, 2025 (arXiv:2602.14878)*
