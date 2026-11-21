# Decisions: platform

## Service and data topology

### Decision

- **Services aggregated by context.** Each service is a small monolith for one business context:
  `identity-service` handles authentication, tenants and users; `services-service` is the business
  context model with per-tenant data; `assistant-service` (Python) is the AI. A new capability that
  fits an existing context is a folder in that service. Splitting a context out needs a real
  divergence in scale, owner or release, and is a new decision.
- **One PostgreSQL, one schema per service.** Each service has its own schema, its migrations history
  inside it and a role without superuser privilege; `PUBLIC` neither creates nor uses those schemas.
  Services talk over HTTP with a token, never through each other's tables.
- **Shared code is infrastructure.** `backend/shared/` holds no business rules. The exception is
  `Admin.SharedKernel.ValueObjects`: formats that are the same in every service (CPF, name, phone,
  e-mail, birth date), without business context.
- **Our own OIDC provider.** `identity-service` is the authority, with OpenIddict and ASP.NET Identity:
  Authorization Code + PKCE for the SPA and client credentials with per-audience scopes for M2M. The
  access token is a signed, unencrypted JWT, so any stack can validate it through JWKS.
- **Aspire is the only orchestrator**, locally and in CI's contract job. There is no Docker in the
  frontend and no second orchestration graph.

Shape details: [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md) §1.

### Why

A solo owner cannot sustain operating fine-grained microservices. Per-service schemas and roles keep
data ownership verifiable by the database without multiplying instances.

### Rejected

- **Fine-grained microservices per capability.** Operation and contract cost without a scale gain.
- **A per-service copy of the context-free value objects.** It would repeat the check-digit algorithm
  and the wire integration in each service.
- **A NuGet package for those value objects.** One solution, no feed: a `ProjectReference` changes
  together with whoever consumes it.
- **Moving `DomainResult` to the shared project.** The Domain would depend on more than formats; it
  stays duplicated per service.

## Multi-tenancy

### Decision

- **The tenant comes only from the validated token's claim.** The `X-Tenant-Id` header is a routing
  convenience in the REST API: `TenantHeaderFilter` refuses a missing, malformed or mismatching
  header before the action. API and MCP share the policy requiring authentication and a non-empty
  GUID `tenant_id`; neither adds subject-format or scope requirements. MCP does not require the
  routing header. `[IgnoreTenant]` requires an explicit justification and is not an anonymous-access policy.
  No business command, query, DTO or repository accepts a tenant chosen by the client.
- **Assignment on save.** `TenantOwnedEntity` entities get the current tenant from the interceptor
  when added; without an available tenant the save fails. An already assigned tenant is never
  swapped.
- **Two named filters on every query:** `SoftDelete` and `Tenant`, applied by the `DbContext`
  convention. No repository ignores them; `IgnoreQueryFilters()` appears only in a persistence test that asserts
  a soft delete.
- **The database enforces relationships.** Every tenant-owned root exposes the candidate key
  `(TenantId, Id)`, and relationships between tenant-owned entities use a composite foreign key with
  the tenant. A foreign key on `Id` alone between them is a defect.
- **Claims keep the token's names** (`MapInboundClaims = false`): `tenant_id` is the tenant and `sub`
  is who goes into the audit columns.
- **Frontend:** the header comes from the session token, never from a URL, a query or a loose value
  in `localStorage`. The HTTP client fails closed without a token or tenant.
- **AI services:** a tenant-owned endpoint requires a JWT with `tenant_id` and the same value in the
  header, validated by a single `TenantContext` dependency.

Automated proof: persistence tests for filters and assignment, and real smokes on Aspire
([process.md](process.md), "Tests and verification"). Review checklist: the
[agenza-tenant-isolation](../../.claude/skills/agenza-tenant-isolation/SKILL.md) skill.

### Why

The tenant is the security boundary of a multi-tenant SaaS; it must hold on the server and in the
database, not depend on every handler remembering it.

### Rejected

- **Enforcing relationships only in the application, with foreign keys on `Id`.** It was enough while
  every write went through EF; it was replaced by composite foreign keys so that no write path can
  create a relationship across tenants.
- **A single filter combining deletion and tenant.** Ignoring the soft delete would turn the tenant
  off too.
- **The accessor reading two claim names**, or keeping the mapping and removing only `sub`: every new
  claim would be renamed without warning.
- **Tenant in the route or query.**

## Authentication, session and AI delegation

### Decision

- **The OIDC session lives in `localStorage`**, so a second tab reuses it. The risk of an XSS on the
  same origin reading the token is accepted: `sessionStorage` does not protect against it in any
  meaningful way.
- **Switching identity requires a new login.** If `sub` or the tenant changes on a renewal, the
  session is cleared entirely and stays blocked until an explicit login.
- **AI delegation:** the AI services receive the user's token and the tenant from the header
  validated against the claim, as in Multi-tenancy.

### Rejected

- **`sessionStorage`.** Each tab would redo the redirect, with no real gain against XSS.
- **Reloading only the current page when the identity changes.** State and mutations loaded with the
  old identity would stay alive.
- **Switching tenant on each page**, or **only clearing the storage**: it would duplicate a security
  cycle in each feature, or leave credentials alive until a reload.
- **A global request registry or a per-tenant cache.** A single session signal is enough.

## Database: bootstrap and migrations

### Decision

- **Automatic migrations and seed are opt-in.** They are off in the base configuration and on only
  in `appsettings.Development.json` or by an explicit override (`DatabaseBootstrap:RunOnStartup`).
  With the bootstrap on, each service applies its migrations and `identity-service` runs its
  idempotent development seed.
- **At most one bootstrap-enabled instance per service.** Concurrent bootstraps are not supported,
  and there is no lock.
- **Migrations are additive and never edited after being committed**; a migration that deletes or
  rewrites data is reviewed on its own. Conventions and commands:
  [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md) §5.

### Rejected

- **A PostgreSQL advisory lock serializing the bootstrap.** It was created and removed: the supported
  topology already has a single bootstrap per service.
- **A shared migrations history in the `public` schema.** It would mix schema ownership.

## Logging

### Decision

- **Serilog is the pipeline of every .NET host**, owned by `backend/shared/Admin.Logging`. Services
  get it through `AddServiceDefaults()`, and the AppHost references it directly; no other project
  does. The Domain has no logging package; the Application writes against `ILogger<T>`, without
  Serilog. Usage and configuration: [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md)
  §8.

### Why

The default provider wrote two lines per event, SQL blocks at `Information` and nothing for a normal
request, and the AppHost logged differently from the services.

## OAuth and MCP

The authority/resource boundary and local callback policy live in [mcp.md](mcp.md).
