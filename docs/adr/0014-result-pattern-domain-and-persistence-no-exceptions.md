# ADR 0014 — Result pattern end-to-end; Domain and persistence no longer throw for expected outcomes

Status: accepted (2026-07); supersedes the exception-related passages of
docs/adr/0005, docs/adr/0006, and docs/adr/0012

## Context

Since ADR 0005, Domain (`Tag`/`Category`/`Service`/`TagColor` in
services-service, `Tenant` in identity-service) has deliberately thrown a
`BusinessException` subtype for its own invariant violations, reasoned as
"defense in depth" behind FluentValidation — Domain has zero project
references, so it couldn't depend on `Admin.SharedKernel`'s `Result`, and by
handler time a domain exception was assumed to signal a validator/domain
mismatch bug rather than a normal outcome (ADR 0005, ADR 0006, ADR 0012).
Application mirrored this once, at the persistence boundary:
`ServicesService.Infrastructure`'s `UnitOfWork.SaveChangesAsync` translated a
Postgres unique-constraint violation into `DuplicateEntityException`, and the
six Create/Update handlers caught it.

A project-level directive now requires that exceptions never be used as
conventional control flow for an *expected* outcome — input validation,
domain invariants, not-found, conflict/duplicate, in-use, tenant
authorization — anywhere in the request path, in either service. Exceptions
are reserved for genuinely unexpected/unrecoverable failures: missing
startup configuration, framework/programmer-error guards, an unrecognized
database error, and transactional rollback cleanup. This overrides the
"Domain throws by default" decision in ADR 0005/0006/0012 — not because that
reasoning was wrong, but because a uniform Result-based contract with zero
exception-based flow is now the explicit requirement.

## Decision

### Domain gets its own local Result type, per service

`{Service}.Domain/Common/DomainResult.cs` + `DomainError.cs` — one pair per
service (`ServicesService.Domain`, `IdentityService.Domain`), structurally
mirroring `Admin.SharedKernel.Result`/`Error` but with zero external
dependencies, preserving Domain's zero-project-reference rule:

```csharp
public class DomainResult
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public DomainError Error { get; }
    public static DomainResult Success();
    public static DomainResult Failure(DomainError error);
    public static DomainResult<T> Success<T>(T value);
    public static DomainResult<T> Failure<T>(DomainError error);
}
public readonly record struct DomainError(string Code, string Message);
```

No `ErrorType`/`FieldErrors` on `DomainError` — every current `BusinessException`
subtype mapped to exactly one HTTP outcome (400), so a richer taxonomy would
be speculative.

### Entities: private constructors, `Create`/`Update` return `DomainResult`

`Service`, `Category`, `Tag`, `TagColor.Create` (renamed from `From`), and
`Tenant` all follow the same shape: the public constructor becomes `private`;
a `public static DomainResult<T> Create(...)` factory runs the same
validation the constructor used to run inline, short-circuiting on the first
invalid field in the same order the old code threw in; `public void
Update(...)` becomes `public DomainResult Update(...)`, keeping the existing
"validate every new value into a local before assigning any field" structure
that already made `Update` atomic — a validation failure now returns
`DomainResult.Failure` without mutating instead of throwing without
mutating. `Tag`'s mapping extensions (`CreateTagCommandExtensions.ToModel()`/
`UpdateTagCommandExtensions.ApplyTo()`) chain two `DomainResult`s
(`TagColor.Create` then `Tag.Create`/`Update`) with explicit sequential
`if (x.IsFailure) return ...` checks — no monadic `Bind` helper, matching the
codebase's established preference for explicit code over abstraction (the
same reasoning ADR 0005 gives for hand-rolling the dispatcher instead of
using MediatR).

`Admin.SharedKernel.Result<T>` — copied faithfully — throws
`InvalidOperationException` when `.Value` is read on a failed result; this
one exception stays, per the codebase's existing convention that a `Result`
type may still protect its own contract against programmer misuse (this was
never in scope for the "no exceptions for expected outcomes" directive,
which is about business flow, not API misuse).

### Application maps `DomainError` → `Admin.SharedKernel.Error`, explicitly

One static mapper per service (`{Service}.Application/Abstractions/DomainErrorMapper.cs`):

```csharp
public static Error ToApplicationError(this DomainError error) =>
    Error.Validation(error.Code, error.Message);
```

Every domain invariant failure maps to `ErrorType.Validation` (400) —
identical HTTP behavior to what `BusinessExceptionHandler` produced before.
`Code` values are preserved 1:1 from the removed exception classes
(`"Tag.Invalid"`, `"Category.Invalid"`, `"Service.Invalid"`,
`"Tenant.Invalid"`), so this is a zero-contract-change refactor for any
consumer already branching on `code`.

### `IUnitOfWork` returns `PersistenceResult<int>`, not `Task<int>` + a thrown exception

`ServicesService.Application/Abstractions/PersistenceResult.cs` +
`PersistenceError.cs` (mirrors `DomainResult`/`DomainError`), replacing
`DuplicateEntityException.cs`:

```csharp
public enum PersistenceErrorKind { UniqueConstraintViolation }
public readonly record struct PersistenceError(PersistenceErrorKind Kind, string? ConstraintName);
public interface IUnitOfWork
{
    Task<PersistenceResult<int>> SaveChangesAsync(CancellationToken cancellationToken);
}
```

Only `UniqueConstraintViolation` exists today — nothing in the codebase
detects foreign-key or concurrency violations (`IsUniqueViolation` only ever
pattern-matches SQLSTATE `23505`), so inventing detection for cases nothing
exercises would be scope creep; the enum is additive-safe for later.
`ServicesService.Infrastructure/Persistence/UnitOfWork.cs` still catches
`DbUpdateException` at its boundary — this remains legitimate per the
directive (catching a provider exception at an infrastructure boundary and
mapping it to a typed result is explicitly allowed) — but now returns
`PersistenceResult.Failure(...)` instead of throwing a translated exception.
Every *other* `DbUpdateException` (an unrecognized Postgres error) still
propagates unhandled to `Admin.SharedKernel.GenericExceptionHandler` → 500,
unchanged — the directive requires unknown database errors stay exceptions.

The six duplicated `MapDuplicateError` bodies (byte-for-byte identical
across Create/Update × Tag/Category/Service) collapse into three small
per-entity mappers at each feature root (`Tags/TagPersistenceErrorMapper.cs`,
`Categories/CategoryPersistenceErrorMapper.cs`,
`Services/ServicePersistenceErrorMapper.cs`), matching the existing
convention that a type shared across a feature's operations lives at the
feature root (`TagResponse.cs` and siblings).

All six Create/Update handlers drop their `try/catch` entirely:

```csharp
var domainResult = Tag.Create(...);
if (domainResult.IsFailure) return Result.Failure<TagResponse>(domainResult.Error.ToApplicationError());
var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
if (saveResult.IsFailure) return Result.Failure<TagResponse>(TagPersistenceErrorMapper.Map(saveResult.Error, command.Name, _logger));
return TagResponse.FromTag(tag);
```

The three Delete handlers (`DeleteTag`/`DeleteCategory`/`DeleteService`)
previously discarded `SaveChangesAsync`'s return value entirely (nothing to
catch, so nothing to check). Once the return type carries a possible
failure, discarding it would silently swallow a real conflict and report
success — each now checks `saveResult.IsFailure` and maps it the same way.

### `TenantOwnedEntity.AssignTenant` keeps throwing — reclassified, not converted

`AssignTenant(Guid.Empty)` now throws a plain `InvalidOperationException`
instead of the removed `InvalidTenantException`. This is not a business
outcome: `TenantHeaderFilter` already rejects any request with a
missing/mismatched tenant header with 403 before any handler or interceptor
runs, so this path is only reachable via an internal bug (a background job,
an M2M path, a programmer error), never directly from a well-formed or
malformed user request — exactly the directive's carve-out for "aplicação
tentando persistir sem contexto de tenant." This also fixes a latent
inconsistency: the old `InvalidTenantException` was a `BusinessException`,
which `BusinessExceptionHandler` mapped to a client-facing 400 — contradicting
ADR 0009's own framing of this condition as an internal bug. Its sibling
guard, `AuditableEntitySaveChangesInterceptor.AssignTenantIfNeeded`, already
threw a plain `InvalidOperationException` for the closely related "no tenant
in context at all" condition (500 via `GenericExceptionHandler`). Both guards
are now consistently typed and consistently mapped.

### `BusinessException` hierarchy and `BusinessExceptionHandler` are deleted, not replaced

`{Service}.Domain/Exceptions/BusinessException.cs` and all five concrete
subclasses (`InvalidCategoryException`, `InvalidServiceException`,
`InvalidTagException`, and both services' `InvalidTenantException`),
`ServicesService.Application/Abstractions/DuplicateEntityException.cs`, and
`{Service}.Api/ExceptionHandling/BusinessExceptionHandler.cs` (both
services) are gone — no equivalent replacement class exists, per the
directive. `Admin.SharedKernel.GenericExceptionHandler` is unchanged: it
remains the sole global exception handler, the explicitly-allowed catch-all
for genuinely unexpected failures (missing config, unrecognized database
errors, framework bugs).

### `AuthorizationController` (identity-service, OpenIddict): expected protocol input no longer throws

Of five throw sites, three were client-reachable "expected" protocol
conditions and become OpenIddict-idiomatic `Forbid(...)` responses carrying
the matching RFC 6749 error code (the same idiom the file already used one
branch away, for `CanSignInAsync` failure):

- A cookie-authenticated user that no longer resolves to a live account
  (deleted/locked after the cookie was issued) → `Errors.LoginRequired`.
- The same condition in the authorization-code/refresh-token exchange path
  is merged into the adjacent `CanSignInAsync` check → `Errors.InvalidGrant`
  (RFC 6749's code for "the grant is no longer valid" already covers both).
- An unsupported `grant_type` → `Errors.UnsupportedGrantType`, replacing
  `NotImplementedException`.

The two `HttpContext.GetOpenIddictServerRequest() ?? throw` sites are kept
as `InvalidOperationException` — OpenIddict's own ASP.NET Core integration
guarantees this is populated before a mapped action runs; a null here means
missing middleware wiring, not client input, matching upstream OpenIddict
samples' own idiom for this null-check and the directive's "estado
impossível do framework" carve-out.

## What stays exception-based, and why

Per the directive's own criteria (predictable outcome vs. genuine technical
failure/programmer error), the following are unaffected by this ADR:

- **Startup/config fail-fast guards** (`?? throw new InvalidOperationException(...)`
  for a missing connection string, `Identity:Authority`, or a seeder secret)
  — a missing required configuration value prevents the application from
  starting correctly; this can never be triggered by a request.
- **`Result<T>`/`DomainResult<T>`/`PersistenceResult<T>`'s own `.Value`
  guard** — protects the type's contract against a caller that didn't check
  `IsSuccess` first; a programmer bug, not a business outcome.
- **identity-service's `UnitOfWork.ExecuteInTransactionAsync`** — its
  `try { ... } catch { rollback; throw; }` wrapper exists purely for
  transactional cleanup on a genuinely unexpected failure; the *business*
  flow inside the transaction already uses `Result.Failure` (an explicit
  `else` branch triggers rollback for that case, no exception involved) —
  this is exactly the pattern the directive's own section on transactions
  says to keep.
- **`AuditableEntitySaveChangesInterceptor`'s "no tenant in context" guard**
  and **`TenantOwnedEntity.AssignTenant`'s empty-guid guard** — both are
  internal-bug guards behind `TenantHeaderFilter`, not user-reachable
  business outcomes (see above).
- **`ModelBuilderExtensions`'s reflection guard** (a `DbContext` missing a
  required `CurrentTenantId` property) — a model-build-time programmer-error
  guard, never triggered by a request.
- **Unrecognized `DbUpdateException`** — still propagates unhandled to
  `GenericExceptionHandler` → 500; only a recognized 23505 unique violation
  becomes a `PersistenceResult.Failure`.

## Consequences

**Benefits**: every layer's failure signature is now explicit in its return
type; handlers have no `try/catch` for business flow; Domain is testable
without asserting on thrown exceptions; fewer stack traces generated for
ordinary invalid input; no exception-based plumbing between Infrastructure
and Application for a database conflict; HTTP status codes remain fully
predictable from `Result`/`DomainResult`/`PersistenceResult` alone.

**Costs**: two small Result types now exist outside `Admin.SharedKernel`
(`DomainResult` × 2 services) plus one persistence-specific one
(`PersistenceResult`, services-service only), each requiring an explicit,
tested mapping to `Admin.SharedKernel.Error`; entity factory/update method
signatures are slightly more verbose (`DomainResult<T>`/`DomainResult`
instead of a plain constructor/`void`); callers must remember to check
`IsFailure` — nothing enforces it at compile time beyond code review, same
as the existing `Result` type.

- 23 Domain-level `.Should().Throw<...>()` test assertions (across
  `TagTests`, `ServiceTests`, `CategoryTests`, `TenantTests`,
  `ProvisionTenantCommandHandlerTests`) were rewritten to assert on a
  returned `Result`/`DomainResult`; three `AssignTenant_WithEmptyTenant_Throws`
  tests were retargeted to `InvalidOperationException` rather than converted,
  since that path is unaffected by this ADR.
- This does not reopen ADR 0005's CQRS-dispatcher-not-MediatR decision, ADR
  0006's tenant-header-validation/`BaseEntity`/generic-repository
  conventions, ADR 0007's command-binding/mapping-extension conventions, ADR
  0008/0009's automatic tenant-assignment mechanism, ADR 0012's
  `ServiceRelationshipLoader`/duplicate-query-elimination work or its
  database-level case-insensitive uniqueness index — only the
  exception-vs-Result question these ADRs previously answered for Domain and
  persistence-conflict handling is superseded.
