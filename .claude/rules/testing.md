# Testing Rules – Aim for Confidence, Not 100% Dogma

Testing is **not optional**. Write tests that give high confidence quickly.

## Workflow Preference
- **TDD / test-first** strongly preferred for business logic, algorithms, utilities.
- For UI / integration → test-after is acceptable if coverage remains high.
- Write a failing test → make it pass → refactor.

## Coverage Targets
- Aim for **≥ 80–85%** branch coverage on core/domain logic.
- **≥ 60–70%** on UI/glue code (diminishing returns).
- 100% is **not** the goal — meaningful tests are.

## Test Types & Pyramid
- **Unit** tests → majority (fast, isolated, mock dependencies)
- **Integration** → cover critical paths (real DB, real API calls when feasible)
- **E2E** / component → sparingly for happy paths + key failures

## Style & Best Practices
- Use **AAA** pattern (Arrange–Act–Assert)
- One assert per test (or very closely related asserts)
- Prefer **explicit** mocks/stubs over auto-mocking
- Test **behavior**, not **implementation** (avoid testing private methods)
- Use **testcontainers** / localstack / in-memory DBs for integration
- **Never** leave failing / commented-out tests

## Tools (choose project defaults, but prefer these patterns)
- Jest / Vitest / Mocha + Chai / node:test
- Testing Library (React/Vue/Svelte) over Enzyme / shallow
- Playwright / Cypress for E2E

Run fast subset of tests frequently (`npm test -- --watch`, vitest --changed` etc.).
Only commit when tests are green.