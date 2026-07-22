---
name: agenza-tenant-isolation-review
description: >
  Use for any multi-tenancy audit — on request, before a release, or
  whenever a change touches auth, a repository, a query, a cache key, or a
  migration. Trigger on "review tenant isolation", "check for cross-tenant
  leaks", "audit multi-tenancy", or when a diff adds a new query, cache
  entry, or index. Treats any observable exposure of one tenant's data to
  another — even transient or read-only — as a security/privacy failure,
  not a code-style issue.
---

# Tenant Isolation Review

Multi-tenancy is a repo-wide non-negotiable (root `AGENTS.md`). This skill
is the checklist for verifying it holds, end to end, for whatever surface
is in scope.

## What to check

- **Claim/header**: the tenant id travels as the `X-Tenant-Id` header,
  cross-checked against the JWT's `tenant_id` claim by
  `Admin.Identity.Client`'s `TenantHeaderFilter` — every controller/action
  either inherits this (default) or is explicitly, deliberately
  `[IgnoreTenant]` for a genuinely tenant-free operation (M2M
  provisioning, OIDC protocol endpoints). Flag any action that reads
  request data implying tenant scope without either the filter applying
  or an explicit, justified `[IgnoreTenant]`.
- **Global filters**: every `ITenantOwned` entity gets its query filter
  from `ApplyAuditableConventions` reading `DbContext.CurrentTenantId` off
  the *live instance* at query time — never a value baked in at
  model-build time (EF Core caches the compiled model per `DbContext`
  *type*, so a baked-in constant leaks across every request regardless of
  the actual caller; see docs/adr/0006 for the incident this caught).
  Grep for `HasQueryFilter` added by hand outside
  `Admin.SharedKernel.EntityFrameworkCore` — that bypasses the automatic
  mechanism and is a red flag by itself.
- **Repositories/queries/handlers**: no method on an `ITenantOwned`
  entity's repository takes an explicit `tenantId` parameter (the
  DbContext scopes it) — a parameter like that is a sign someone hand-
  rolled scoping instead of relying on the automatic mechanism, which is
  itself worth flagging even if the value passed happens to be correct
  today.
- **New-entity assignment**: `AuditableEntitySaveChangesInterceptor` calls
  `AssignTenant` on save for any newly added `ITenantOwned` entity with
  `TenantId == Guid.Empty`, sourcing it from `ICurrentTenantProvider` — it
  must throw rather than persist a tenant-less row when none is available
  (docs/adr/0008). Flag any handler that tries to set `TenantId` itself.
- **Frontend cache/query keys**: any client-side cache (`useAsync`'s
  `resetKey`, a memoized list, browser storage) keyed in a way that
  includes the tenant id or is cleared synchronously on tenant switch —
  see `agent-skills/agenza-frontend-feature`'s `useAsync` section for the
  `resetKey` mechanism. A cache that survives a tenant switch and can
  render the previous tenant's data for even one frame is a finding, not
  a nit.
- **Indexes/FKs**: a uniqueness index scoped per-tenant (e.g.
  `(TenantId, NameNormalized)`, not `(NameNormalized)` alone) — a global
  unique index on a business field is itself a cross-tenant leak (tenant
  A can't reuse a name tenant B already used). A composite FK crossing
  tenant boundaries (referencing another tenant's row) is a finding.
- **Migrations**: hand off to `agent-skills/agenza-migration-safety` for
  the migration-safety half; this skill only confirms the resulting
  schema still enforces tenant scoping (index/FK shape above).
- **Logs**: a log statement that includes another tenant's data alongside
  the current request's tenant context (e.g. logging "n other tenants had
  this name" with their identifying info) — logging the *fact* of a
  conflict is fine, logging the *other tenant's* data usually isn't.
- **Tests**: does a cross-tenant-access test exist for this surface (a
  request/query with tenant A's context attempting to read/write tenant
  B's row)? If not, that's a coverage gap to flag, and to close if the
  task is implementation, not just review.

## Severity

Any confirmed cross-tenant data exposure — even read-only, even UI-only,
even transient (a single frame, a stale cache entry, a log line) — is a
**security/privacy failure**, not a style issue. Report it at the top of
any findings list, regardless of what else is in scope, and treat the fix
as blocking.

## Output format

`surface (endpoint/query/cache/index) | mechanism relied on | verified? |
finding (if any) | severity | fix`. For anything not directly verifiable
by reading code (e.g. actual runtime behavior of a query filter), say so
explicitly and recommend the manual two-tenant verification step already
called out in `agent-skills/agenza-backend-use-case` ("Automatic tenant
assignment has no automated regression test") rather than asserting it's
safe from static reading alone.
