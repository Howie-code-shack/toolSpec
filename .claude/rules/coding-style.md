# Coding Style & Architecture Rules

Enforce clean, maintainable, idiomatic code. Favor readability + long-term velocity over short cleverness.

## General Principles
- Write **self-documenting code** — good names > comments.
- Prefer **immutability** (const/readonly/frozen objects, immutable data structures, pure functions).
- Follow **single responsibility** + **small functions** (< 30–40 lines ideal).
- Keep cyclomatic complexity low (≤ 8–10 per function).
- Use **early returns** + guard clauses instead of deep nesting.

## File & Project Organization
- **Named exports only** — no default exports except in config files (e.g. `tsup.config.ts`, `vitest.config.ts`). Named exports are more refactor-friendly and work better with monorepo re-exports and tree-shaking.
- Colocate tests (e.g. `feature.test.ts` next to `feature.ts`).
- Use domain/feature-based structure over type-based (e.g. `/features/user/` not `/controllers/` + `/models/`).
- Group by cohesion, not by technical concern.

## Naming & Conventions
- Variables/functions: **camelCase**
- Types/interfaces/classes: **PascalCase**
- Constants: **SCREAMING_SNAKE_CASE** (or UPPER_CAMEL if immutable object)
- Files: kebab-case for most (component-name.tsx), index.ts for barrels
- Avoid abbreviations unless ubiquitous (i, db, ctx ok; usr, authSvc → no)

## TypeScript / Static Typing (when applicable)
- Use **strict mode** + **noImplicitAny**
- Prefer **exact types** over `any` / `unknown` (narrow via type guards)
- Use branded types / newtypes for domain primitives (UserId, MoneyAmount)

## Language-specific Defaults
- JavaScript/TypeScript → ES modules (import/export), **not** CommonJS
- Prefer **destructuring** and **object shorthand**
- Use **template literals** over concatenation

## Comments & Documentation
- Write JSDoc / docstrings for public APIs only.
- Explain **why**, not **what** (the code should show what).
- **No** TODO/FIXME without ticket reference.

Follow language idioms (idiomatic Go, Rust, Python PEP 8/20, etc.) unless project specifies otherwise.