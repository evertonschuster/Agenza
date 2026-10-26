# Validation

From `apps/admin-frontend`, run the unit/component tests for `shared/session`, `shared/api`, and `features/auth`, then the full coverage, lint, format and build gates.

Use the repository's Aspire stack for the real OIDC smoke, OpenAPI drift check and Playwright suite. Test identity changes with the real session store and the sanctioned token fixtures in component tests; never add a product endpoint or network mock to forge an identity.

Expected: normal renewal keeps the page; identity change removes protected content and cancels an outstanding request; only explicit login can release the failure state.

## Validation on 2026-10-26

Typecheck/production build, lint, format, OpenAPI drift, real OIDC smoke and the full Playwright suite passed. Unit/component coverage passed with the existing thresholds; the local run used two Vitest workers after concurrent checks caused five-second test timeouts. No test timeout or coverage threshold was relaxed.
