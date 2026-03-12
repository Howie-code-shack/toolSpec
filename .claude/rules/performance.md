# Performance & LLM Efficiency Rules

Optimize for speed, cost, and quality in agentic coding sessions.

## Model Selection
- Use fastest capable model for routine tasks (Haiku / Sonnet fast tier).
- Switch to Opus / top-tier only for:
  - Complex architecture
  - Deep debugging
  - Security reviews
  - Refactoring legacy code

## Context Management
- **Minimize** context bloat — summarize, prune, use @file sparingly.
- Prefer **targeted** @-mentions over dumping whole files.
- Use **/clear** aggressively between unrelated tasks.
- Break big tasks into **small steps** with checkpoints.

## Tool & Command Usage
- Prefer **fast tools** first (grep, rg, git grep) over slow ones (full codebase search).
- Cache expensive computations when possible.
- Run **single tests** during dev loop, not full suite.

## General Guidelines
- **Think step-by-step** before writing large code blocks.
- Prefer **incremental** changes over big-bang rewrites.
- Ask user to confirm plan **before** heavy computation / many file writes.

Goal: fast feedback loops, low token burn, high-quality output.