# Backend — defence in depth, layer by layer

Six layers. Each exists because the one above it can be wrong, so a review question is always
"which layer does this change weaken?" — not "is it still safe overall?".

## 1. The action filter — the boundary

`backend/shared/Admin.Identity.Client/TenantHeaderFilter.cs`. A global `IAsyncActionFilter` that runs
before any controller action and **Forbids unless the `X-Tenant-Id` header parses as a GUID, the
principal carries a `tenant_id` claim, and the two are equal**. Missing header, unparseable header,
missing claim and mismatch all take the same path: 403, `ProblemDetails`, `code` extension
`Tenant.ContextMismatch`, title *"O tenant autenticado não corresponde ao X-Tenant-Id."*

Two properties worth defending in review:

- **Default-required, opt-out.** Every action needs a validated tenant unless marked
  `[IgnoreTenant]`. This inverts the old per-action opt-in, so a new action cannot ship unscoped by
  omission — only by an explicit attribute someone has to write and someone has to approve. There
  are **zero `[IgnoreTenant]` uses in the codebase today.**
- **Registered in `services-service`'s `Program.cs` only.** identity-service deliberately does not
  register it: `TenantsController` is M2M provisioning (no tenant claim can exist for a tenant that
  does not exist yet, gated on the `identity-admin` scope instead) and the OIDC endpoints must keep
  working for callers that never send a custom header. Blanket-marking them `[IgnoreTenant]` was
  considered and rejected — adding a filter to login/token/logout for no benefit. A *new*
  tenant-scoped controller in identity-service registers the filter in that service.

## 2. The accessor — the source

`HttpContextTenantAccessor` reads `tenant_id` off `HttpContext.User` — the authenticated principal,
never the header. This is the direction that matters: the filter compares the header *against* the
accessor. If a change ever makes the accessor read the header, the filter degenerates into comparing
the header with itself and the whole scheme is gone with no test failing.

`TenantId` throws when the claim is absent; `TryGetTenantId` is for endpoints callable by both user
and M2M tokens. Past the filter, an action can use the throwing property — the filter has already
guaranteed the claim is there.

## 3. The global query filter — every read

`Admin.SharedKernel.EntityFrameworkCore/ModelBuilderExtensions.cs`, `ApplyAuditableConventions`,
called once from `ServicesDataContext.OnModelCreating`. It walks the model and, for any
`ITenantOwned` type, builds one combined predicate — soft-delete **and** tenant — plus the supporting
indexes. EF Core allows a single `HasQueryFilter` per entity, hence one predicate rather than two.

**The trap, and the single most valuable thing to know about this file:** EF Core compiles and caches
the model per `DbContext` *type*, not per instance. An earlier version baked the tenant into the
expression as `Expression.Constant(guidValue)` — so whichever request happened to build the model
first had **its** tenant permanently baked in for every later request, on every connection, forever.
The fix is `Expression.Property(Expression.Constant(dbContext, dbContext.GetType()), CurrentTenantId)`:
a `this`-instance member access is the one thing EF re-evaluates against the context actually running
each query. `ServicesDataContextTenantScopingTests` constructs two contexts for two tenants against
the same cached model precisely to catch a regression here. Any diff that touches `BuildFilter`,
`CurrentTenantId`, or how the context is registered in DI is a stop-and-read.

With no tenant in context — background work, an M2M token — `CurrentTenantId` is `Guid.Empty`, which
no real row carries, so reads come back **empty rather than global**. Fail closed.

`IgnoreQueryFilters()` drops tenant scoping and soft-delete together. Its one legitimate use in the
repo is a persistence test asserting a row was soft-deleted rather than removed.

## 4. The save interceptor — every write

`AuditableEntitySaveChangesInterceptor` stamps audit fields, turns a `Deleted` entry into a soft
delete, and for every `Added` `ITenantOwned` with an empty `TenantId` calls `AssignTenant` from
`ICurrentTenantProvider` — **or throws** if no tenant is available, so a tenant-less row cannot reach
the database ([ADR 0008](../../../../docs/adr/0008-automatic-tenant-assignment-on-save.md)).

This is why **no command, DTO, mapping extension or repository method carries a tenant**. A diff that
adds `Guid tenantId` to a command record or a repository signature is undoing the decision, not
extending it. New tenant-owned entities inherit `TenantOwnedEntity`
([ADR 0009](../../../../docs/adr/0009-tenant-owned-entity-base-class.md)) and declare nothing about
tenancy themselves.

The trade-off is stated plainly in ADR 0008: an entity can exist tenant-less *in memory* between
construction and save. The guarantee moved from "unrepresentable" to "unpersistable" — so a review of
domain code must not assume a constructed entity already has a tenant.

## 5. The schema — composite keys

[ADR 0024](../../../../docs/adr/0024-database-enforced-data-ownership.md) (superseding
[ADR 0013](../../../../docs/adr/0013-tenant-scoped-relationships-enforced-at-the-application-layer.md)):
tenant-owned principals expose `(TenantId, Id)` as a candidate key, and relationships between
tenant-owned entities use composite FKs carrying `TenantId`. An `Id`-only FK between two tenant-owned
entities is a finding — it lets a row from tenant A point at a row from tenant B for anything that
writes outside EF.

## 6. The database roles — the floor

`infra/postgres/init/001-service-roles.sh`. `identity_app` owns only the `identity` schema,
`services_app` only `services`; `PUBLIC` gets neither create nor usage. A compromised or
mis-configured service connection cannot read the other module's tables even with a correct
connection string. Changes here are infrastructure-level findings: check that a new schema gets an
owner and that the other role is revoked, not merely not granted.

## AI service (`ai-services/assistant-service`)

`app/auth/tenant_context.py` is the same contract in FastAPI shape:
`require_tenant_context` depends on `require_valid_token`, parses the `tenant_id` claim and the
`X-Tenant-Id` header as UUIDs, and raises 403 `invalid_tenant_context` on missing, malformed, or
mismatched. **The `TenantContext` it returns is the only tenant value application code may touch** —
a route that reaches into raw claims itself has bypassed the boundary.
[ADR 0022](../../../../docs/adr/0022-ai-tenant-context-and-delegation.md) also settles:

- Liveness and readiness stay tenant-free; every tenant-owned route requires the dependency.
- Calling another tenant-owned service **delegates the caller's access token** and forwards the
  validated header. `ServiceTokenClient`'s client-credentials token is reserved for explicitly
  tenant-free control-plane work — using it to reach a tenant-owned API is the request that "fails
  closed today and creates pressure to weaken the downstream check later".
- Background work carries an immutable job envelope with the tenant id. There is no process-wide
  "current tenant" and inventing one is the finding.

## Tests

The two mechanisms with dedicated regression coverage live in `ServicesService.PersistenceTests`
([ADR 0019](../../../../docs/adr/0019-narrow-tenant-isolation-persistence-tests.md)) — EF InMemory,
no Docker: `AuditableEntitySaveChangesInterceptorTests` (assignment on add, throw with no tenant,
soft delete) and `ServicesDataContextTenantScopingTests` (per-tenant reads, and the two-context
model-cache scenario from §3). The project is intentionally named without a `.Tests` suffix so the
80% assembly coverage gate does not pressure anyone into padding it with unrelated tests.

The AI service's tenant checks are covered by unit tests for missing claim, missing header, malformed
UUID and mismatch. A change to `require_tenant_context` that does not touch them is under-tested.
