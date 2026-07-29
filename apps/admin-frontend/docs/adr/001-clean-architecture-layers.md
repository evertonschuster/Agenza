# ADR 001 — Clean Architecture layer structure

**Status:** Accepted; the top-level `domain`/`application`/`infrastructure`/
`presentation` physical layout superseded by docs/adr/009's feature-based
layout (`app/`, `features/{auth,catalog}/`, `shared/`). The inward-only
dependency rule itself still applies, now enforced per-feature instead of
per top-level directory.

## Decision

Organise the codebase into four layers with a strict inward-only
dependency rule: `domain` ← `application` ← `infrastructure` +
`composition` + `presentation`.

## Enforcement

ESLint `no-restricted-imports` rules prevent `domain/` and `application/`
from importing React, react-router, or any outer-layer module. Violations
fail the explicit lint command and CI.

## Consequences

- Domain and use case logic is framework-agnostic and testable in isolation
- Swapping IdentityServer, the HTTP client, or the router requires changes
  only in the outer layers
- `composition/container.ts` is the single place allowed to import and
  wire concrete implementations
