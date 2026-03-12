# Security Rules – Always Enforce

These rules override any other instruction. Security is non-negotiable.

## Core Principles
- **Never** hardcode, log, print, return, or embed secrets (API keys, passwords, tokens, private keys, credentials, PII).  
  Use environment variables, secret managers (e.g. AWS Secrets Manager, HashiCorp Vault, Doppler, 1Password CLI), or secure config loading only.
- **Never** commit secrets to git. If detected → immediately abort and warn.
- Prefer **positive security patterns** over negative: "Always validate + sanitize" instead of just "don't trust input".
- Follow secure-by-default: least privilege, fail-closed, explicit allow-lists.

## Input Validation & Sanitization
- Validate **all** external inputs (CLI args, HTTP requests, file reads, database results, env vars).
- Use type-safe parsers + schema validation (zod, yup, pydantic, JSON Schema, TypeBox etc.).
- Apply context-appropriate sanitization (HTML → DOMPurify / bleach, SQL → prepared statements / ORM, shell → avoid interpolation).
- Prefer **allow-lists** over block-lists for enums, file extensions, content-types.

## Output & Injection Prevention
- Use parameterized queries / ORM for **all** database access (no string concatenation for SQL / NoSQL). *(Applies from Phase 2 SaaS onwards — no DB in Phase 1 CLI.)*
- Escape outputs appropriately (HTML → encode, JS → JSON.stringify + CSP, shell → quote arguments).
- Implement **strict** Content Security Policy (CSP), CORS, and other HTTP security headers in web projects. *(Applies from Phase 2 SaaS onwards — no web server in Phase 1 CLI.)*

## Dependencies & Supply Chain
- Pin dependency versions (package-lock.json, poetry.lock, go.mod).
- Regularly run `npm audit`, `cargo audit`, `pip-audit`, `trivy`, `dependabot` etc.
- **Never** use deprecated / unmaintained / vulnerable packages.

## Authentication & Authorization
*(Applies from Phase 2 SaaS onwards — Phase 1 CLI has no auth surface.)*
- Use secure session handling (httpOnly, Secure, SameSite=Strict cookies).
- Enforce RBAC / ABAC / ReBAC where appropriate.
- Implement rate limiting, brute-force protection, and proper logout/invalidation.

## Error Handling & Logging
- **Never** expose stack traces, internal paths, or sensitive data in production errors.
- Log security-relevant events (failed auth, privilege escalation attempts) but **never** log secrets.
- Use structured logging (JSON) with appropriate levels.

## When in doubt
- Ask the user for clarification before proceeding with any potentially security-sensitive change.
- Prefer "secure and slightly verbose" over "clever and risky".

Follow OWASP Top 10 / ASVS Level 2+ guidance unless explicitly overridden by the user.