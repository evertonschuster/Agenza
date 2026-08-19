<!--
Sync Impact Report
==================
Version change: (unratified template) → 1.0.0
Rationale: Initial ratification. The file previously held only unfilled template
placeholders ([PROJECT_NAME], [PRINCIPLE_1_NAME], ...); no concrete governance
existed yet, so this is treated as first adoption (MAJOR 1.0.0), not an amendment.

Modified principles: N/A (initial ratification, nothing to rename)

Added sections:
  - Core Principles I–VI (Strict TypeScript; Multi-Tenant Safety Enforced
    Server-Side; Authentication via identity-service with Fixed Ports;
    Generated OpenAPI Client Only; CI Quality Gates Non-Negotiable From
    Scaffold; No Frontend Docker)
  - Technology & Environment Context
  - Explicitly Deferred Decisions
  - Governance (amendment procedure, versioning policy, compliance review)

Removed sections: none

Deferred / open items (intentionally left for /speckit-plan, not this file):
  - UI component library choice
  - State/data-fetching approach (server-state library or not)
  - Dependency injection pattern
  - Folder/module structure
  - Error taxonomy
  These are recorded under "Explicitly Deferred Decisions" below so future
  plans don't assume a constitutional constraint exists where none does.

Templates checked for alignment:
  - .specify/templates/plan-template.md — ✅ Constitution Check gate is
    derived dynamically from this file at run time ("[Gates determined based
    on constitution file]"); no hardcoded principle list to update.
  - .specify/templates/spec-template.md — ✅ no constitution-specific
    references found.
  - .specify/templates/tasks-template.md — ✅ no constitution-specific
    references found.
  - .specify/templates/checklist-template.md — ✅ no constitution-specific
    references found.

Follow-up TODOs: none. All placeholders resolved from user-supplied input.
-->

# Agenza Admin Frontend Constitution

## Core Principles

### I. Strict TypeScript
TypeScript **MUST** run in `strict` mode across the entire codebase; implicit
`any` is forbidden anywhere in application or shared code. An exception, if
ever unavoidable, requires an explicit, narrowly-scoped suppression with a
comment justifying why the type cannot be known — never a blanket loosening
of `tsconfig.json`.
**Rationale**: The admin frontend is the operational control surface for
tenant data; type errors that could be caught at compile time must not
survive to run against production tenant data.

### II. Multi-Tenant Safety Is Enforced Server-Side, Never Trusted From the Client
No view, hook, API call, or cache key may treat a tenant identifier supplied
by the client (route param, query string, local storage, component state,
etc.) as authoritative. The tenant **MUST** always be resolved from the
validated OIDC token/claims on each request; any client-supplied tenant hint
is display-only and MUST NOT influence authorization or data scoping.
**Rationale**: This is an admin panel with cross-tenant blast radius; a
single trusted-client-id bug is a cross-tenant data leak, not a cosmetic bug.

### III. Authentication via the Existing identity-service (Fixed Ports)
All authentication **MUST** go through OIDC against the existing
`identity-service`, running at the fixed development port `5081`. The admin
frontend **MUST** run at the fixed development port `5173`. Neither port is
negotiable in local development.
**Rationale**: Aspire's AppHost wiring, CORS allow-lists, and the
identity-service's registered OIDC redirect URIs are configured against
these exact ports; changing either breaks local orchestration for every
developer, not just one machine.

### IV. Generated OpenAPI Client Only
All calls to backend services **MUST** go through the TypeScript client
generated from each service's OpenAPI contract. Hand-written `fetch` calls
and hand-written request/response DTOs for backend endpoints are forbidden.
**Rationale**: Contract drift between backend and frontend must be caught at
generation/build time, not discovered at runtime. Enforcement is backstopped
by the CI drift check in Principle V.

### V. CI Quality Gates Are Non-Negotiable From Scaffold
The following gates, already wired in `frontend-ci.yml`, **MUST** pass before
merge starting from the very first scaffold commit — they are not "added
later": ESLint, Prettier, `tsc` type-check, Vitest with coverage, Playwright
end-to-end tests, a drift check on the generated OpenAPI client, and a real
(non-mocked) OIDC smoke test.
**Rationale**: Retrofitting quality gates onto an already-growing codebase is
far more expensive than starting with them; the OIDC smoke test in
particular exists because auth misconfiguration fails silently in ways unit
tests can't catch.

### VI. No Frontend Docker — Aspire Is the Only Local Orchestrator
The admin frontend **MUST NOT** ship a Dockerfile or any Docker-based
orchestration for local development. All local orchestration goes through
.NET Aspire (`backend/AppHost`).
**Rationale**: A second local orchestration path would drift from what
Aspire actually wires (ports, CORS, service discovery, identity-service
integration) and become an unmaintained parallel setup.

## Technology & Environment Context

The admin frontend is the `admin-frontend` app inside the Agenza monorepo: a
React + TypeScript + Vite single-page application, managed as an npm
workspace package, and orchestrated locally by .NET Aspire
(`backend/AppHost`) alongside its backend dependencies `identity-service` and
`services-service`. It does not stand alone — its dev-time behavior (ports,
CORS, auth redirects, service URLs) is a function of how Aspire wires it to
those services, not something the frontend configures independently.

## Explicitly Deferred Decisions

The following are intentionally **not** constrained by this constitution and
are decided per-feature in `/speckit-plan`, not here:

- UI component library
- State/data-fetching approach (whether a server-state library is used, and
  which)
- Dependency injection pattern
- Folder/module structure
- Error taxonomy

A `/speckit-plan` that settles one of these **MUST** record the decision
explicitly (e.g., an ADR or the plan's Technical Context) rather than letting
it emerge implicitly from whichever PR happens to touch it first. Once a
decision is recorded, later plans should follow it for consistency, but
changing it is a planning-level decision, not a constitutional amendment.

## Governance

This constitution supersedes ad hoc convention for anything it covers.
Amendments are made by editing `.specify/memory/constitution.md` directly,
with an updated Sync Impact Report prepended describing what changed and
why; they take effect on merge. Versioning follows semantic versioning:
MAJOR for removing or redefining a principle, MINOR for adding a principle or
materially expanding one, PATCH for wording or clarification only.

Every `/speckit-plan` and `/speckit-implement` run **MUST** treat these
principles as hard constraints: a plan or task that conflicts with a
principle must either be changed to comply, or must document the conflict
under Complexity Tracking and get explicit sign-off before proceeding —
silent deviation is not permitted. The CI gates in Principle V are the
automated enforcement mechanism for Principles I and IV; Principles II, III,
and VI are not fully mechanically checkable and are enforced through code
review.

**Version**: 1.0.0 | **Ratified**: 2026-08-18 | **Last Amended**: 2026-08-18
