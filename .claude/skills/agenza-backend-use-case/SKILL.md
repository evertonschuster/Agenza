---
name: agenza-backend-use-case
description: >
  Use whenever adding or changing business logic in any .NET backend service
  under backend/ — a new command, query, entity, value object, repository
  method, or endpoint, or any change to an existing one. Trigger on "add
  endpoint", "implement [operation]", "create [entity]", "command", "query",
  "handler", "validator", "vertical slice". Encodes this repo's CQRS/
  vertical-slice/Result-pattern conventions (docs/adr/0005, docs/adr/0012,
  docs/adr/0014), layering, rich-domain, tenant-scoping, and testing rules.
  Do NOT write backend business logic without reading it first — it also
  documents patterns this codebase already tried and reverted, so an agent
  that skips it is likely to reintroduce a fixed bug.
---

# Backend Use Case

The reference implementation is `services-service`'s Tags vertical — open
these files and mirror their shape exactly:

- `ServicesService.Domain/Entities/Tag.cs`, `ValueObjects/TagColor.cs` — entity/VO with invariants
- `ServicesService.Application/Tags/CreateTag/` — full command slice
- `ServicesService.Application/Tags/UpdateTag/` — same, plus `UpdateTagCommandExtensions.ApplyTo`
- `ServicesService.Application/Tags/TagPersistenceErrorMapper.cs` — persistence-conflict mapping
- `ServicesService.Application/Tags/TagResponse.cs` — DTO shared across the feature's operations
- `ServicesService.Application/Abstractions/` — ports (`ITagRepository`, `IUnitOfWork`)
- `ServicesService.Api/Controllers/TagsController.cs` — direct command binding + Result → HTTP mapping (docs/adr/0007)
- `ServicesService.Tests/Tags/CreateTag/` — handler + validator unit tests

identity-service's `Tenants/ProvisionTenant/` slice is the second
reference — read it when the operation needs a database transaction
across more than one abstraction (see the UnitOfWork note in step 3 below).

## Decision tree — where does a given rule live?

| The rule is about...                                     | It lives in...                          |
| ---------------------------------------------------------- | ------------------------------------------ |
| Shape of the command's own data (required, length, format, numeric range, cross-field comparison within the same command) | **FluentValidation** validator, sync rules only |
| Current state of the application (existence, uniqueness, in-use, another aggregate) | The **handler** — a plain `if (...) return Result.Failure(...)` before persisting |
| A permanent invariant of the entity itself (a `Tag` can never have an empty name, a `Service`'s min duration can never exceed its max) | **`DomainResult`** from the entity's `Create`/`Update` |
| Data integrity / concurrency at the database boundary (a unique index catching a race the pre-check missed) | The database + **`PersistenceResult`**, mapped by a per-entity `*PersistenceErrorMapper` |
| A genuinely unexpected, unrecoverable technical failure (missing config, an unrecognized DB error, a framework guarantee) | **Exception** — the one case where throwing is still correct |

## Hard prohibitions (these are reverted patterns — see docs/adr/0012, docs/adr/0014)

Do **not** write any of the following. `scripts/architecture_guard.py`
fails the build on several of these; the rest are still real regressions
even where the guard can't catch them syntactically.

- A repository (or any port) injected into a validator's constructor.
- `MustAsync`/`CustomAsync` on a FluentValidation rule that queries a
  repository or the database. Validators in this repo are pure, synchronous
  shape checks — nothing in them ever awaits.
- Throwing for an expected business outcome (validation failure, not-found,
  conflict/duplicate, in-use, forbidden). Everything expected returns a
  `Result`/`DomainResult`/`PersistenceResult`.
- Conventional `try/catch` in a handler to convert a business outcome. The
  only handler-level `try/catch` in this codebase is
  `IUnitOfWork.ExecuteInTransactionAsync`'s rollback-on-unexpected-failure
  wrapper (identity-service) — never a catch that maps to a `Result`.
- `DuplicateEntityException` (deleted, docs/adr/0014 — a unique-constraint
  race returns `PersistenceResult.Failure` instead).
- `BusinessExceptionHandler` (deleted — `Admin.SharedKernel.GenericExceptionHandler`
  is the only exception handler; it exists purely for unexpected 500s).
- A null-forgiving `!` on a repository lookup that assumes some earlier
  validator step already guaranteed existence. Validators here never do
  existence checks (they take no repository dependency at all) — the
  handler that needs the entity fetches it itself and returns
  `Error.NotFound(...)` on a null, in the same method, before doing
  anything else with it.
- A brand-new project/folder split for a feature that fits inside an
  existing service's `Application/<Feature>/<Operation>/` shape. Only
  create a new microservice for a genuinely new bounded context — see
  `.skills/backend-new-microservice/SKILL.md`.
- Wiring MediatR, or any DI registration for a handler/validator by hand —
  `AddXApplication()` assembly-scans for both; a new slice needs no
  registration at all.

## Build order (TDD — test first at each step)

Read [references/templates.md](references/templates.md) before writing any
new command, query, entity, controller, or test — it has full copy-paste
code for every shape below.

### 1. Domain entity or value object

- If the entity does NOT belong to a tenant (rare — e.g. `Tenant` itself
  in identity-service), inherit `{Service}.Domain.Common.BaseEntity`
  directly — gives `Id`, `CreatedAt`/`CreatedBy`, `UpdatedAt`/
  `UpdatedBy`, `DeletedAt`/`DeletedBy`, `IsDeleted` for free
  (docs/adr/0006). Call `base(id)` from your constructor; never set the
  audit fields yourself, the EF interceptor does that.
- If the entity belongs to a tenant (the common case), inherit
  `{Service}.Domain.Common.TenantOwnedEntity` instead — it already
  inherits `BaseEntity` and implements `ITenantOwned` (`Guid TenantId
  { get; }` + `void AssignTenant(Guid tenantId)`) for you, so don't
  implement `ITenantOwned` or add an `AssignTenant` override on the
  entity itself. The constructor never takes a `tenantId` parameter at
  all — `TenantId` starts `Guid.Empty` and only `AssignTenant` (inherited)
  can set it, throwing a plain `InvalidOperationException` on empty
  (docs/adr/0009, docs/adr/0014) — the one entity-level path allowed to
  throw instead of returning `DomainResult`, since it's only reachable via
  an internal bug (`TenantHeaderFilter` already rejects a request with no/
  mismatched tenant before any handler runs).
- Public constructor becomes `private`; add a `public static
  DomainResult<Widget> Create(...)` factory that validates every
  invariant and returns `DomainResult.Failure<Widget>(new
  DomainError("Widget.Invalid", message))` on the first invalid field
  instead of throwing — never a raw `Exception`/`ArgumentException`
  (docs/adr/0014). `DomainResult`/`DomainResult<T>`/`DomainError`
  (`{Service}.Domain/Common/`) already exist per service — copy them
  once, not per entity.
- State-changing methods (`Update`, `Cancel`, `Reschedule`) return
  `DomainResult` (not `void`) for the same reason — validate every new
  value into a local before assigning any field, so a failure never
  leaves the entity partially mutated.
- No public setters. Add a `private` parameterless constructor ONLY if EF
  needs it, and keep it private.
- Tests: plain xUnit + AwesomeAssertions, no mocks needed — Domain has
  zero dependencies. Cover `MarkCreated`/`MarkUpdated`/`MarkDeleted`
  (inherited from `BaseEntity`) too — they count toward the coverage
  gate. `AssignTenant` (if `ITenantOwned`) is the one exception to the
  `DomainResult` rule — assert it throws `InvalidOperationException` on
  an empty guid.

### 2. Port (interface) in `Application/Abstractions/`

- Narrow, intention-revealing methods (`Add`, `GetByIdAsync`,
  `NameExistsAsync`) — not a generic interface. `Add`/`Remove` are
  synchronous and only stage the change (no internal commit).
- If the entity is `ITenantOwned`, its methods do NOT take a tenant id
  parameter — the DbContext scopes the query automatically (step 5,
  docs/adr/0006).
- The **implementation** (step 5) extends
  `Admin.SharedKernel.EntityFrameworkCore.RepositoryBase<TEntity>` for
  the Add/Remove/Find/List boilerplate underneath this interface — the
  port itself stays a plain, narrow interface.

### 3. Command or query slice in `Application/<Feature>/<Operation>/`

```
Application/Tags/
├── TagResponse.cs                     shared DTO (feature root)
├── TagPersistenceErrorMapper.cs       shared persistence-conflict mapper (feature root)
└── CreateTag/
    ├── CreateTagCommand.cs            : ICommand<TagResponse>
    ├── CreateTagCommandValidator.cs   AbstractValidator<CreateTagCommand> - shape only, parameterless
    └── CreateTagCommandHandler.cs     : ICommandHandler<CreateTagCommand, TagResponse>
```

- A **command** mutates (`ICommand` if nothing to return,
  `ICommand<TResponse>` otherwise); a **query** reads
  (`IQuery<TResponse>`). Handler returns `Result` / `Result<TResponse>`
  — never throws for an expected business outcome. Use
  `Error.Validation/.NotFound/.Conflict/.Forbidden(code, message)`.
- Validator: **shape rules only**, parameterless constructor, no
  repository, no `MustAsync`/`CustomAsync` — see the prohibitions above.
- Cross-aggregate rules needing a repository round-trip (existence,
  uniqueness, in-use) live in the **handler**, checked in this order
  before any mutation: not-found → duplicate/conflict → build/apply the
  domain change → persist → map a persistence conflict. See
  `Application/Services/ServiceRelationshipLoader.cs` for a
  multi-dependency version that loads Category/Tags exactly once
  and reuses the same instances for both construction and the response.
- Constructor-injected ports only — no EF, no HttpClient, no ASP.NET
  types in Application.
- Multiple writes that must succeed together → wrap in `IUnitOfWork`,
  shaped to the real need (docs/adr/0005): a single
  `Task<PersistenceResult<int>> SaveChangesAsync(...)` if everything goes
  through one `DbContext` (services-service's shape — lets Infrastructure
  report a recognized unique-constraint violation without throwing), or a
  Result-aware `ExecuteInTransactionAsync<TResult>` if the operation spans
  more than one abstraction that each commit independently, e.g. an EF
  repository AND `UserManager` (identity-service's shape).
- Nothing to register by hand — each service's
  `Application/DependencyInjection.cs` scans the assembly for handlers
  and validators.
- If the handler constructs or mutates a domain entity from the
  command's fields, put that mapping in a `{Operation}CommandExtensions.cs`
  extension method beside the command (`ToModel(...)` for construction,
  `ApplyTo(entity)` for mutation) instead of inlining it in `Handle(...)`
  (docs/adr/0007). Both return `DomainResult<Widget>`/`DomainResult`
  respectively, so the handler checks `IsFailure` and maps via
  `.Error.ToApplicationError()` before proceeding.

### 4. Unit tests with NSubstitute

- `Substitute.For<IPort>()` per port used by the handler — no hand-written
  fake classes (docs/adr/0006). Configure return values with
  `.Returns(...)`; assert interaction with `.Received(1).Method(...)` /
  `.DidNotReceive().Method(...)`.
- AwesomeAssertions, asserting on the `Result`: `result.IsSuccess`,
  `result.Value.Xyz`, `result.Error.Type.Should().Be(ErrorType.Conflict)`.
- Test the happy path, the not-found path, the duplicate/conflict path,
  and any `DomainResult.Failure` path the handler can still hit — a
  handler unit test calls `Handle(...)` directly, bypassing the
  validator, so it exercises paths production traffic never reaches.
- Validator tests use the synchronous `Validate(...)` (no `MustAsync`
  rules exist to require `ValidateAsync`) and need no repository fakes at
  all, since the validator takes none.

### 5. Infrastructure adapter

- Repository extends `Admin.SharedKernel.EntityFrameworkCore.RepositoryBase<TEntity>`
  and implements the port (docs/adr/0006). `Add`/`Remove` only stage the
  change — no `SaveChangesAsync` inside the repository (the handler
  commits via `IUnitOfWork`).
- EF configuration lives in `Infrastructure/Persistence/Configurations/`.
  The soft-delete query filter and `DeletedAt` index apply automatically
  to every `BaseEntity`, and (if `ITenantOwned`) the tenant filter +
  `TenantId` index too — the `DbContext` calls
  `ApplyAuditableConventions(this, typeof(BaseEntity), typeof(ITenantOwned))`
  once. Never add `HasQueryFilter` by hand. If the entity has a
  uniqueness rule, add a unique index on a normalized column (see
  `IX_Tags_TenantId_NameNormalized`) filtered with
  `.HasFilter("\"DeletedAt\" IS NULL")` so a soft-deleted row doesn't
  block reusing its unique value — this index, not the handler's
  pre-check, is what actually guarantees uniqueness under concurrency
  (see `agent-skills/agenza-migration-safety` for the migration itself).
- If the entity is tenant-owned, also pass `ICurrentTenantProvider` into
  `AuditableEntitySaveChangesInterceptor`'s constructor so it can call
  `AssignTenant` on a newly added entity automatically (docs/adr/0008).
- New tables → `dotnet ef migrations add <Name>` from the Api project
  directory.

### 6. Controller (thin)

- Constructor-inject `IDispatcher` (never a concrete handler type) —
  nothing else. The global `TenantHeaderFilter` already rejected the
  request with 403 before this action runs unless `X-Tenant-Id` matched
  the token's `tenant_id` claim — mark the controller/action
  `[IgnoreTenant]` instead if it genuinely isn't tenant-scoped.
- `[ApiVersion("1.0")]` + `[Route("api/v{version:apiVersion}/...")]` (or
  `internal/v{version:apiVersion}/...` for M2M-only routes).
- **Bind the command/query directly as the action parameter — no local
  `...Body` record** (docs/adr/0007). A route id binds into its own
  `Guid id` parameter and gets merged into the command right before
  dispatching: `command with { WidgetId = id }`.
- `await _dispatcher.Send(...)` / `.Query(...)` →
  `result.ToActionResult(this, value => Ok(value))` (or `Created`/
  `NoContent`). No try/catch per exception type.
- `[Authorize]` by default; scope checks (`User.HasScope(...)`) for
  M2M-only endpoints.

### 7. Manual verification of the new endpoint

There are no integration tests (docs/adr/0015) — CI runs unit tests only.
Before merging, run the service (`dotnet run --project services/<service>/{Service}.Api`)
and manually exercise the new endpoint: unauthenticated → 401, wrong
scope/tenant → 403, a validation failure → 400, duplicate name → 409,
unknown id → 404, happy path → expected status + persisted effect.

## Definition of done

```bash
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx   # unit tests only; coverage gate via Directory.Build.props/.targets
python scripts/architecture_guard.py    # fails on any reverted pattern above
```

Both green, coverage gate passing, no new NU1903 (vulnerable package)
warnings, architecture guard clean.
