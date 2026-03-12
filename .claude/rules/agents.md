# Agent & Subagent Delegation Rules

Use subagents / child agents / tools efficiently.

## When to Delegate
- Delegate when task is **well-scoped**, **repetitive**, or benefits from **specialization**.
- Examples:
  - Security audit → security subagent
  - Refactoring large module → dedicated refactor agent
  - Writing documentation → docs agent
  - Generating tests → test specialist
- **Do NOT** delegate open-ended / ambiguous tasks — clarify first.

## How to Delegate
- Give subagent **clear goal** + **exact scope** + relevant context only.
- Use **small, focused** context windows for subagents.
- **Always** review subagent output before merging/committing.
- Prefer **parallel** subagents for independent work (e.g. style + test + security review).

## When to Stay Single-Agent
- Small fixes (< 50 LOC)
- Understanding unfamiliar code
- Architectural decisions
- Anything requiring holistic project knowledge

## Safety
- Subagents **never** get permission to commit/push without main agent review.
- Main agent remains **accountable** for final output.

Delegate to multiply throughput — but never to abdicate responsibility.