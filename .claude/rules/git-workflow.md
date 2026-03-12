# Git & Collaboration Workflow

Follow modern, high-velocity git practices.

## Branching Strategy
- Main branch = **trunk** (protected, always deployable)
- Short-lived feature/bugfix branches (`feat/add-user-auth`, `fix/payment-500`)
- **No** long-lived dev/staging branches
- Use **trunk-based development** — integrate frequently (daily)

## Commit Message Format
- Conventional Commits:  
  `type(scope): short description`  
  Examples:  
  `feat(auth): add OAuth2 login flow`  
  `fix(api): handle 429 rate limit response`  
  `chore(deps): upgrade zod to 3.24`  
  `refactor: extract payment validation logic`
- Keep subject ≤ 72 chars
- Body optional — explain **why** + breaking changes

## Pull Requests / Reviews
- Small PRs (< 400 lines ideal)
- **One** concern per PR
- Title = first line of commit (or very similar)
- Include **description** + test evidence + screenshots (UI)
- Require **≥ 1 approval** before merge
- Use **rebase** over merge commits (clean history)
- Delete branch after merge

## Other Rules
- **Never** force-push to main/trunk
- **Never** commit directly to main (except emergencies — and revert after)
- Run tests + linter + build before opening PR
- Use **dependabot** / renovate for automated dependency PRs

Aim for fast feedback loops and linear, readable history.