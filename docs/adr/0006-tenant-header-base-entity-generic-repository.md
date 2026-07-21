# ADR 0006 — Tenant header validation, BaseEntity/soft delete, GUID v7, generic repository, NSubstitute, business exceptions, automatic tenant scoping

Status: accepted (2026-07); BusinessException hierarchy / per-service
BusinessExceptionHandler convention superseded by docs/adr/0014 (Domain
returns DomainResult, no exception-based flow for expected outcomes)

## Context

Seven related conventions changed together, all cutting across both
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
6. Every command handler that constructed a domain entity repeated the
   same `try { ... } catch (SomeSpecificDomainException exception) {
   return Result.Failure(Error.Validation(...)); }` boilerplate, and
   `Tenant`'s constructor threw a raw `ArgumentException` instead of a
   purpose-built domain exception.
7. Each entity's `IEntityTypeConfiguration` repeated the same
   `HasQueryFilter(e => e.DeletedAt == null)` line by hand.
8. Every controller/command/repository method in the Tags slice threaded
   `Guid tenantId` by hand end to end (`TagsController` → `CreateTagCommand`
   → `CreateTagCommandHandler` → `ITagRepository.ListAsync(tenantId, ...)`),
   even though the value always came from the same place
   (`ITenantAccessor`) and every read needed the identical `.Where(t =>
   t.TenantId == tenantId)` clause.
9. `BusinessExceptionHandler` left every non-`BusinessException` to 500
   with no logging - a real bug would fail silently from the API's
   perspective.

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
a repository's `Remove()` never actually deletes a row.

The soft-delete query filter and a supporting `DeletedAt` index are
**applied automatically**, not written by hand per entity:
`Admin.SharedKernel.EntityFrameworkCore.ModelBuilderExtensions.ApplyAuditableConventions(this,
baseEntityType, tenantOwnedType)` walks every entity type in the model at
`OnModelCreating` time and, for any type assignable to the service's own
`BaseEntity`, adds `HasQueryFilter(e => e.DeletedAt == null)` and
`HasIndex("DeletedAt")` via reflection/expression-tree building (it takes
runtime `Type`s rather than generic parameters so it doesn't need to
reference any service's Domain - see "Automatic tenant scoping" below
for why it also takes the `DbContext` instance itself). Each
`DbContext.OnModelCreating` calls it once, after
`ApplyConfigurationsFromAssembly`. A new entity gets both for free just
by inheriting `BaseEntity` - an `IEntityTypeConfiguration` only needs to
add a *business-specific* filtered unique index
(`HasFilter("\"DeletedAt\" IS NULL")`) if it has a uniqueness rule; it
never repeats the soft-delete filter itself.

### GUID v7 for every new entity id

Handlers call `Guid.CreateVersion7()` directly (available since .NET 9;
this repo targets .NET 10) wherever they used to call `Guid.NewGuid()`
to mint a new aggregate id (`CreateTagCommandHandler`,
`ProvisionTenantCommandHandler`). No wrapper - `Guid.CreateVersion7()` is
already a one-line BCL call, so a `IdGenerator.NewId()` indirection
around it added a name to learn without adding behavior. The
timestamp-ordered prefix keeps primary key inserts roughly sequential,
avoiding the b-tree fragmentation fully random v4 ids cause at scale.

### Generic RepositoryBase, in its own Infrastructure-only shared project

`Admin.SharedKernel.EntityFrameworkCore` (new project, referenced only by
each service's Infrastructure - never by Application/Domain) provides
`RepositoryBase<TEntity>` with predicate-based `FindAsync`/`ListAsync`/
`AnyAsync` and `Add`/`Remove` over a `DbContext`. `TagRepository`/
`TenantRepository` extend it and add their own intention-revealing public
methods on top - the port interfaces (`ITagRepository`/`ITenantRepository`)
own their own shape, so this is purely an implementation-side
de-duplication.

Kept as a **separate project from `Admin.SharedKernel`**, not folded in:
`Admin.SharedKernel` is referenced directly by every service's
Application layer, which must never depend on EF Core (layering
non-negotiable). A generic repository needs `Microsoft.EntityFrameworkCore`,
so it gets its own project that only Infrastructure references.

Not a single rigid interface across services: Tenant isn't itself
tenant-scoped (it *is* the tenant), so `RepositoryBase` only supplies
Add/Remove/Find/List primitives, not tenant scoping - see "Automatic
tenant scoping" below for how tenant-owned entities like `Tag` get
scoped instead.

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

### BusinessException hierarchy + one global exception handler, not a try/catch per handler

Every exception a Domain entity/value object throws for its own
invariant violations now inherits `{Service}.Domain.Exceptions.BusinessException`
(abstract, `Code` + `Message` - `InvalidTagException`/
`InvalidTenantException` are the concrete types so far).
**Duplicated per service**, same reasoning as `BaseEntity`: Domain has
zero project references, so it can't reference a shared assembly even
for a pure `Exception` subclass.

Command handlers **no longer catch it themselves**. Each service's Api
registers one `BusinessExceptionHandler : IExceptionHandler`
(`builder.Services.AddExceptionHandler<BusinessExceptionHandler>()` +
`AddProblemDetails()`, `app.UseExceptionHandler()` early in the
pipeline) that catches any `BusinessException` reaching it and writes a
400 Problem Details response (`Title` = `Code`, `Detail` = `Message`).
Anything that isn't a `BusinessException` is left unhandled (`TryHandleAsync`
returns `false`) and still 500s - the repo rule that an exception
escaping this far is a real bug or infrastructure failure, not an
expected outcome, is unchanged.

This removes the `try { ... } catch (InvalidTagException exception) {
return Result.Failure(...); }` boilerplate every handler used to repeat:
`CreateTagCommandHandler`/`UpdateTagCommandHandler`/
`ProvisionTenantCommandHandler` just construct/mutate the domain object
directly now. **Only reachable in normal operation as a defense-in-depth
safety net** - FluentValidation already rejects malformed shape before
the handler runs, so a `BusinessException` at handler time means the
validator and the domain disagree (a bug). Unit tests that call
`Handle(...)` directly (bypassing the validator layer entirely, as
handler tests do) exercise this path directly and assert
`await act.Should().ThrowAsync<InvalidTagException>()` instead of
inspecting a returned `Result`.

Exceptions still never replace `Result.Failure` for **expected** outcomes
- cross-aggregate rules that need a repository round-trip (uniqueness,
existence) keep returning `Result.Failure(Error.Conflict/NotFound(...))`
exactly as before; role/scope checks
(`User.HasScope(...)`) keep returning `Forbid()`. Exceptions are
reserved for the single case they now consistently cover: a Domain
invariant violation that should have been caught by
FluentValidation/dispatcher and reaches Domain construction anyway.

### Automatic tenant scoping: ITenantOwned + ICurrentTenantProvider, no more manual tenantId threading

Tenant-owned entities implement `ITenantOwned` (`Guid TenantId { get; }`,
`{Service}.Domain/Common/ITenantOwned.cs` - a marker interface, not part
of `BaseEntity`, since not every entity is tenant-owned; `Tenant` itself
never implements it). The `DbContext` captures the current request's
tenant id (via `ICurrentTenantProvider`, optional constructor parameter
defaulting to `null` for `dotnet ef` design-time tooling) into a public
`CurrentTenantId` property, and passes `this` into
`ApplyAuditableConventions(this, baseEntityType, tenantOwnedType)`, which
adds `HasQueryFilter(e => e.DeletedAt == null && e.TenantId ==
CurrentTenantId)` (EF Core only allows one `HasQueryFilter` per entity
type, so it's one combined predicate) and a `TenantId` index for any
`ITenantOwned` type.

**The filter must read `CurrentTenantId` off the live DbContext instance,
not a value snapshotted at model-build time.** EF Core compiles and
caches the model once per `DbContext` *type*, not per instance - an
earlier version of this passed a `Guid?` value straight into the filter
expression as a `ConstantExpression`, which meant whichever request
happened to build the model first had its tenant id permanently baked in
for every later request, regardless of who was actually asking (caught
by `ServicesDataContextTenantScopingTests`, which constructs two
`ServicesDataContext` instances for two different tenants against the
same cached model and asserts each only sees its own rows). The fix:
`ModelBuilderExtensions.BuildFilter` builds `Expression.Property(Expression.Constant(dbContext,
dbContext.GetType()), currentTenantIdProperty)` instead of
`Expression.Constant(guidValue)` - EF Core specially re-evaluates a
`this`-instance member access against whichever context instance is
actually executing a given query, which is exactly the documented
pattern for multi-tenant global query filters. With no tenant in context
(background work, an M2M token) `CurrentTenantId` defaults to
`Guid.Empty`, which no real row has, so the result set is empty rather
than every tenant's data.

This makes `ITagRepository`'s methods and `Tag`'s command/query records
**tenant-blind**: `ListAsync(ct)`, `GetByIdAsync(tagId, ct)`,
`NameExistsAsync(name, excludeTagId, ct)`, `CreateTagCommand(Name,
Color, Description)` (no `TenantId` field at all) - the tenant never
needs to be threaded through Controller → Command → Handler → Repository
by hand. The one place a tenant-owned entity is *constructed* still
needs the tenant explicitly (a domain invariant: "a tag must belong to a
tenant"), sourced from `ICurrentTenantProvider` injected directly into
that handler (`CreateTagCommandHandler`) - a port in
`Application/Abstractions/`, implemented in Infrastructure by wrapping
`ITenantAccessor`, so Application still never depends on
`Admin.Identity.Client`/ASP.NET Core directly. `TagsController` no
longer needs `ITenantAccessor` at all.

`TenantHeaderFilter` (see above) is still what makes this safe: by the
time any handler or the `DbContext` runs, the request's tenant has
already been validated against the JWT claim. The `DbContext`-level
filter is defense in depth on top of that, not the primary control.

### GenericExceptionHandler: a shared, logging catch-all after BusinessExceptionHandler

`Admin.SharedKernel.GenericExceptionHandler` (shared - no Domain
dependency, so no reason to duplicate per service) is registered after
`BusinessExceptionHandler` (`IExceptionHandler`s run in registration
order until one returns `true`). It logs the exception at Error level
via `ILogger<GenericExceptionHandler>` and writes a generic 500 Problem
Details response with no exception details in the body. Replaces the
previous "left unhandled, still 500s" behavior with an explicit,
logged, non-leaking response for anything that isn't a
`BusinessException`.

## Consequences

- A new controller action gets tenant scoping for free (global filter);
  forgetting the check is no longer possible, only forgetting
  `[IgnoreTenant]` on a genuinely tenant-free action - a fail-closed
  default (403) rather than the old fail-open shape (an unscoped query).
- A new entity: inherit `BaseEntity`, call `Guid.CreateVersion7()` when
  constructing it, add a filtered unique index in its
  `IEntityTypeConfiguration` only if it has a uniqueness rule (the
  soft-delete filter/`DeletedAt` index apply automatically via
  `ApplyAuditableConventions`, called once from the `DbContext`). The
  service's Infrastructure DI must wire
  `AuditableEntitySaveChangesInterceptor` via `AddInterceptors` (copy the
  existing services' `DependencyInjection.cs`) and register
  `ICurrentUserAccessor` if the service isn't already calling
  `AddIdentityServiceAuthentication` (identity-service registers it
  directly since it's the identity provider, not a JwtBearer resource
  server).
- A new repository: extend `RepositoryBase<TEntity>` from
  `Admin.SharedKernel.EntityFrameworkCore` instead of hand-rolling
  Add/Remove/Find/List.
- A new domain invariant exception: inherit that service's
  `BusinessException`, give it a `Code`. No try/catch needed in the
  handler that constructs the entity - the Api's global
  `BusinessExceptionHandler` covers it, and `GenericExceptionHandler`
  logs/500s anything that isn't a `BusinessException`.
- A new tenant-owned entity: implement `ITenantOwned`. The `DbContext`
  needs a public `CurrentTenantId` property and to pass `typeof(ITenantOwned)`
  to `ApplyAuditableConventions` (copy the existing wiring exactly - the
  filter must read that property off the live instance, never a
  snapshotted value, see "Automatic tenant scoping" above). Its
  repository/commands/queries never need an explicit
  `tenantId` parameter; the one handler that constructs a new instance
  gets the tenant from `ICurrentTenantProvider`.
- New unit tests use `Substitute.For<T>()`, not a new hand-written fake
  class per port.
- `backend/CLAUDE.md`, `backend-use-case`/`backend-new-microservice`
  skills, and admin-frontend's `AuthenticatedHttpClient`/`HttpClient`
  port docs are updated to teach this shape as the default - see those
  files rather than duplicating the checklist here.
