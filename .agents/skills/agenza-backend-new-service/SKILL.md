---
name: agenza-backend-new-service
description: >
  Use when creating a brand-new .NET service under backend/services or when
  deciding whether a capability needs its own service. Covers this repository's
  context-aggregated service boundary, project layout, central package
  management, tenant-safe persistence, authentication, Aspire wiring, tests,
  and documentation. Do not copy an old service template without reading it.
---

# Backend new service

Create a service only for a genuinely new business context. If an existing
service owns the capability, use `agenza-backend-use-case` there instead. ADR
0001 records the context-aggregated service decision.

## Use live references

Inspect the current `services-service`, `identity-service`, AppHost, solution,
`backend/Directory.Packages.props`, and CI workflow before writing files. They
are the executable templates; this skill intentionally contains no copied
`Program.cs`, `.csproj`, or package-version blocks that can drift.

## Required shape

1. Create Domain, Application, Infrastructure, Api, and Tests projects and add
   them to `backend/AdminBackend.slnx`.
2. Add a separate PersistenceTests project when the service owns tenant-scoped
   EF entities/query filters or another persistence mechanism whose security
   behavior cannot be proven by Domain/Application unit tests.
3. Preserve inward references: Domain has no project dependency; Application
   references Domain and the framework-agnostic shared kernel; Infrastructure
   implements Application ports; Api composes Application/Infrastructure and
   may reference the ASP.NET Core shared package; Tests reference only the
   layers their boundary needs.
4. Use central package management. Add a version once to
   `backend/Directory.Packages.props`; project files contain versionless
   `PackageReference` entries. Never run an unreviewed latest-version upgrade as
   part of scaffolding.

## Application and domain

- Follow `agenza-backend-use-case` for the first vertical slice.
- Use rich entities with `DomainResult`, handlers returning `Result`, and
  `PersistenceResult` at technical persistence boundaries. Expected business
  outcomes do not throw.
- Define a service-local UnitOfWork shape that matches its real transaction
  boundary; do not copy another service's interface blindly.
- Register handlers and validators through the service's assembly-scanning
  application extension rather than one registration per slice.

## Tenant safety and persistence

- Resource services use `Admin.Identity.Client`, an authorization filter, and
  `TenantHeaderFilter` by default. `[IgnoreTenant]` is only for a reviewed,
  genuinely tenant-free action.
- Tenant-owned aggregates inherit the service-local `TenantOwnedEntity` shape.
  The save interceptor assigns the current tenant; handlers do not set or accept
  arbitrary tenant ids.
- Apply shared auditable/tenant conventions from `DbContext.OnModelCreating`.
  Do not add hand-written query filters or capture a tenant constant during
  model construction.
- Use one schema and migrations-history table owned by the service. Any schema
  change also uses `agenza-migration-safety`.
- Add persistence tests proving automatic tenant assignment and cross-tenant
  query isolation. Manual smoke testing complements these tests; it does not
  replace them.

## API, runtime, and delivery

- Add API versioning to business routes; do not version fixed OIDC protocol
  endpoints.
- Register the service's audience/scope in identity-service and exercise both
  allowed and denied access where the runtime smoke boundary applies.
- Add the project and database/resource dependencies to
  `backend/AppHost/AppHost.cs`. Aspire remains the only local orchestrator; do
  not add Docker Compose or application Dockerfiles.
- Add the service to `docs/MONOREPO.md` and its context to `docs/VISION.md`.
- Run the backend, governance, and any affected API-contract gates before
  completion.

