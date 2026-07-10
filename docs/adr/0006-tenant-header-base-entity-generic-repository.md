# ADR 0006 — Tenant header validation, BaseEntity/soft delete, GUID v7, generic repository, NSubstitute

Status: accepted (2026-07)

## Context

Five related conventions changed together, all cutting across both
services and the shared libraries:

1. Every controller action repeated `if
   (!_tenantAccessor.TryGetTenantId(out var tenantId)) return Forbid();`
   - boilerplate that's easy to forget on a new action, with no
   compiler-enforced consequence if you do.
2. Every entity needed the same audit shape (who created/updated/deleted
   a row, and when) with no shared base to build on.
3. Entity ids used `Guid.NewGuid()` (UUID v4) - fully random, which
   fragments the primary key index as rows are inserted out of order.
4. `TagRepository`/`TenantRepository` each hand-rolled the same
   Add/Remove/Find-by-predicate/List-by-predicate boilerplate.
5. Unit tests used hand-written fake repositories (ADR 0005's original
   choice, to avoid a mocking library dependency) - workable with one
   repository per service, but every new port meant a new hand-written
   fake to keep in sync with the real interface by hand.

## Decisions

### Tenant id travels in a header, verified against the JWT claim, default-required

The client sends the tenant id in the `X-Tenant-Id` header on every
request (`AuthenticatedHttpClient` in admin-frontend attaches it
automatically, mirroring how it attaches the bearer token). Root
CLAUDE.md's non-negotiable still holds: **a tenant id from the client is
never trusted on its own** - `Admin.Identity.Client`'s new
`TenantHeaderFilter` (a global `IAsyncActionFilter`) rejects the request
with 403 before any controller action runs unless the header is present
and equals the token's `tenant_id` claim exactly.

The default is **required**: every action needs a validated tenant
unless explicitly opted out with `[IgnoreTenant]` (class or method). This
inverts the old per-action opt-in (`TryGetTenantId` + manual `Forbid()`)
into a global opt-out, so a new action can't accidentally ship
tenant-unscoped.

Because the filter runs before the controller, actions that need the
tenant just read `ITenantAccessor.TenantId` (the throwing property, not
`TryGetTenantId`) - the filter has already guaranteed it's present and
matches the header.

**Wired into services-service's `Program.cs` only.** identity-service has
no tenant-scoped resource controllers today - `TenantsController` is
M2M-only provisioning (no tenant claim exists yet for a tenant that
doesn't exist), and `UserinfoController`/`AuthorizationController`/
`EndSessionController` are OIDC protocol endpoints that must keep working
for callers that never send a custom header (browser redirects, token
exchange). Registering the filter there too and blanket-marking all four
controllers `[IgnoreTenant]` was considered and rejected: it adds risk to
security-critical login/token/logout endpoints for no benefit, since none
of them are tenant-scoped resources. A future tenant-scoped controller in
identity-service registers the filter itself in that service's
`Program.cs` and marks any genuinely tenant-free actions with
`[IgnoreTenant]`, same as services-service.

### BaseEntity: audit fields + real soft delete, one copy per service Domain

Every aggregate root now inherits `BaseEntity` (`Id`, `CreatedAt`/
`CreatedBy`, `UpdatedAt`/`UpdatedBy`, `DeletedAt`/`DeletedBy`,
`IsDeleted`). Audit fields are set only through behavior methods
(`MarkCreated`/`MarkUpdated`/`MarkDeleted`), never public setters - same
rich-domain rule as everything else in Domain.

**Duplicated per service** (`{Service}.Domain/Common/BaseEntity.cs`), not
shared from `Admin.SharedKernel`: Domain has zero project references
(backend/CLAUDE.md, enforced by project reference layering), so it
cannot reference a shared assembly, even a POCO-only one. The type is
small and stable (audit shape essentially never changes), so duplication
costs less than either violating the zero-reference rule or introducing
a second exception to it.

Delete is a **real soft delete**: `AuditableEntitySaveChangesInterceptor`
(one per service's Infrastructure, since each pattern-matches its own
service's `BaseEntity` type) intercepts `SaveChanges(Async)`, stamps
`CreatedAt`/`CreatedBy` on `Added` entries and `UpdatedAt`/`UpdatedBy` on
`Modified` entries via `ICurrentUserAccessor` (new - mirrors
`ITenantAccessor`, reads the `sub` claim) and `TimeProvider`, and turns a
tracked `Deleted` entry into `Modified` after calling `MarkDeleted` - so
a repository's `Remove()` never actually deletes a row. Each entity
configuration adds `HasQueryFilter(e => e.DeletedAt == null)` so every
ordinary read excludes soft-deleted rows automatically, and the
uniqueness indexes (`Tag(TenantId, Name)`, `Tenant(Name)`) are filtered
(`HasFilter("\"DeletedAt\" IS NULL")`) so a soft-deleted row doesn't
permanently block reusing its name.

### GUID v7 for every new entity id

`Admin.SharedKernel.IdGenerator.NewId()` wraps `Guid.CreateVersion7()`
(available since .NET 9; this repo targets .NET 10). Every handler that
used to call `Guid.NewGuid()` to mint a new aggregate id
(`CreateTagCommandHandler`, `ProvisionTenantCommandHandler`) now calls
`IdGenerator.NewId()` instead. The timestamp-ordered prefix keeps primary
key inserts roughly sequential, avoiding the b-tree fragmentation fully
random v4 ids cause at scale.

### Generic RepositoryBase, in its own Infrastructure-only shared project

`Admin.SharedKernel.EntityFrameworkCore` (new project, referenced only by
each service's Infrastructure - never by Application/Domain) provides
`RepositoryBase<TEntity>` with predicate-based `FindAsync`/`ListAsync`/
`AnyAsync` and `Add`/`Remove` over a `DbContext`. `TagRepository`/
`TenantRepository` extend it and add their own tenant-scoped,
intention-revealing public methods (`ListAsync(tenantId, ct)`,
`NameExistsAsync(...)`) on top - the port interfaces
(`ITagRepository`/`ITenantRepository`) are unchanged, so this is purely
an implementation-side de-duplication.

Kept as a **separate project from `Admin.SharedKernel`**, not folded in:
`Admin.SharedKernel` is referenced directly by every service's
Application layer, which must never depend on EF Core (layering
non-negotiable). A generic repository needs `Microsoft.EntityFrameworkCore`,
so it gets its own project that only Infrastructure references.

Not a single rigid interface across services: Tenant isn't itself
tenant-scoped (it *is* the tenant), so `RepositoryBase` only supplies
Add/Remove/Find/List primitives - each concrete repository still decides
its own tenant-scoping shape, keeping the "every repository method takes
the tenant id explicitly" rule intact.

### NSubstitute replaces hand-written fakes for unit tests

ADR 0005 originally chose hand-written fakes to avoid a mocking-library
dependency question entirely. That trade-off flips as the number of
ports grows: every new port needs a new hand-written fake kept in sync
with the interface by hand, with no compiler help when the interface
changes shape. **NSubstitute** (MIT-licensed, no commercial-license risk
- same free-tooling bar as ADR 0005's MediatR/FluentAssertions
decisions) replaces `FakeTagRepository`/`FakeUnitOfWork` and the inline
fakes in `ProvisionTenantCommandHandlerTests`.

Pattern: `Substitute.For<IPort>()`, configure return values with
`.Returns(...)`, assert interaction with `.Received(n)`/`.DidNotReceive()`.
A global `<Using Include="NSubstitute" />` is set per test csproj,
alongside the existing `AwesomeAssertions` using.

## Consequences

- A new controller action gets tenant scoping for free (global filter);
  forgetting the check is no longer possible, only forgetting
  `[IgnoreTenant]` on a genuinely tenant-free action - a fail-closed
  default (403) rather than the old fail-open shape (an unscoped query).
- A new entity: inherit `BaseEntity`, call `IdGenerator.NewId()` when
  constructing it, add `HasQueryFilter`/filtered unique indexes in its
  `IEntityTypeConfiguration`. The service's Infrastructure DI must wire
  `AuditableEntitySaveChangesInterceptor` via `AddInterceptors` (copy the
  existing services' `DependencyInjection.cs`) and register
  `ICurrentUserAccessor` if the service isn't already calling
  `AddIdentityServiceAuthentication` (identity-service registers it
  directly since it's the identity provider, not a JwtBearer resource
  server).
- A new repository: extend `RepositoryBase<TEntity>` from
  `Admin.SharedKernel.EntityFrameworkCore` instead of hand-rolling
  Add/Remove/Find/List.
- New unit tests use `Substitute.For<T>()`, not a new hand-written fake
  class per port.
- `backend/CLAUDE.md`, `backend-use-case`/`backend-new-microservice`
  skills, and admin-frontend's `AuthenticatedHttpClient`/`HttpClient`
  port docs are updated to teach this shape as the default - see those
  files rather than duplicating the checklist here.
