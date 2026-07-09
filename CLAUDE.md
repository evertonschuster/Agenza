# Admin Panel Monorepo — AI Assistant Instructions

## Repo-wide non-negotiables

- **Tenant scoping**: every query/command in every service (frontend use case,
  .NET application-layer handler, Python endpoint) must be scoped to a tenant.
  Never trust a tenant id from the client without also verifying it against the
  authenticated principal.
- **Clean Architecture per app/service**: each app and each backend microservice
  keeps its own Domain → Application → Infrastructure/Presentation layering, with
  dependencies only pointing inward. Don't reach across services' internals —
  cross-service contracts go through HTTP APIs or `packages/shared-types`, never
  shared database access.
- **No shared mutable state across stacks.** The frontend, .NET services, and
  Python services communicate over HTTP (and later, events) — not shared files,
  shared DB writes from multiple services, or in-process calls.
- Both `build` and `test` must pass for whichever stack you touched before
  considering a change done — see each stack's own instructions for exact commands.

## Where to look next

- Working on the frontend (`apps/admin-frontend`)? Read
  [apps/admin-frontend/CLAUDE.md](apps/admin-frontend/CLAUDE.md) — it has the full
  TypeScript/architecture/testing rules for that app.
- Working on a .NET microservice (`backend/`)? Read
  [backend/CLAUDE.md](backend/CLAUDE.md) — layering, rich-domain, tenant-scoping,
  and testing conventions, plus skills for use cases and new services.
- Working on a Python AI service (`ai-services/<service>`)? Read that service's own
  `README.md`.
- Repo structure and workspace conventions: [docs/MONOREPO.md](docs/MONOREPO.md).
- Where the platform is heading (planned apps/services): [docs/VISION.md](docs/VISION.md).
- How developers direct agents here (workflow + example prompts): [docs/SDD-GUIDE.md](docs/SDD-GUIDE.md).
- CI, coverage gates, Sonar/CodeQL/review tooling: [docs/QUALITY.md](docs/QUALITY.md).
- Cross-cutting decisions with rationale: [docs/adr/](docs/adr/).
