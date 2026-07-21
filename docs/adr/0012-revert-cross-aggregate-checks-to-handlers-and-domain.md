# ADR 0012 — Cross-aggregate checks move back to handlers; Domain throws again

Status: accepted (2026-07); supersedes docs/adr/0010 and docs/adr/0011;
Domain-throws-again / DuplicateEntityException convention superseded by
docs/adr/0014 (Domain returns DomainResult, persistence conflicts return
PersistenceResult)

## Context

ADR 0010 moved existence/uniqueness/in-use checks for Tags, Categories, and
Services out of Create/Update/Delete handlers and into FluentValidation
validators as async `MustAsync`/`CustomAsync` rules. ADR 0011 then deleted the
matching Domain-level invariants (duration range, price, discount,
`TagColor` palette membership) on the grounds that the validators already
covered them.

Revisiting both decisions surfaced three concrete problems:

1. **Every FluentValidation failure — shape or cross-aggregate — collapsed
   into a single generic 400.** `Admin.SharedKernel/Dispatcher.cs`'s
   `ValidateAsync` never read FluentValidation's `ErrorCode`/`Severity`, so a
   duplicate name or a missing Category/Tag/Service, which should be a 409 or
   404, came back as a 400 indistinguishable from "the name was empty."
   ADR 0010 explicitly accepted this trade-off; it is no longer accepted.
2. **Moving the checks into validators didn't eliminate the duplicate
   queries it was meant to reduce — it just moved them.** `CreateService`'s
   validator queried Category and Tags for existence, and the handler queried
   Tags again to actually attach them and Category again to build the
   response. `UpdateService` was worse: validator and handler each fetched
   the Service, the Category, and the Tags independently.
3. **Domain lost defense-in-depth for genuine invariants** (duration
   ordering, price, discount range, color palette) that a validator bug or a
   handler that skips validation could no longer catch.

## Decision

Cross-aggregate rules that need a repository round-trip (existence,
uniqueness, in-use) move back into the six Create/Update/Delete handlers
across Tags, Categories, and Services. Validators go back to pure shape
rules only (required, length, format, numeric range/precision, cross-field
comparisons within the same command) and no longer take repository
dependencies. `Tag`, `Category`, `Service`, and `TagColor.From` throw again
on invalid construction — the same defense-in-depth pattern
`identity-service`'s `Tenant` already used and never stopped using.

### Handlers return semantically correct results

- Unknown id (Category/Service/Tag) → `Error.NotFound`.
- Duplicate name → `Error.Conflict`.
- Category/Tag still referenced by a Service on delete → `Error.Conflict`.
- Structural/shape violation → `Error.Validation` (unchanged, still 400).

### Duplicate queries eliminated, not just relocated

- **`ServiceRelationshipLoader`** (`Application/Services/`) loads and
  validates a Service's Category (if an id is given) and Tags (if ids are
  given) exactly once per request. `CreateServiceCommandHandler` and
  `UpdateServiceCommandHandler` both use it and reuse the same loaded
  instances for construction/mutation **and** for building the response —
  the old validator-then-handler double-fetch of Category and Tags is gone.
- `CreateServiceCommandHandler` now checks the duplicate-name and
  relationship existence *before* calling `IServiceCodeGenerator`, so a
  rejected create no longer burns a code from the tenant's sequence.
- `UpdateCategoryCommandHandler`/`UpdateTagCommandHandler` fetch the entity
  once (no separate validator-side existence check) and reuse it directly —
  no more re-fetch-with-`!` pattern.
- `ListServicesQueryHandler` no longer loads the tenant's entire Category
  catalog on every page. It collects the distinct, non-null `CategoryId`s
  actually present in the returned page (at most `pageSize`) and calls a new
  `ICategoryRepository.GetByIdsAsync` for just those — mirroring
  `ITagRepository.GetByIdsAsync`, which already existed for the same reason.

### Database-level case-insensitive uniqueness (docs/adr item, section 8 of the review brief)

The exact-match unique index on `(TenantId, Name)` for `Categories`,
`Services`, and `Tags` is replaced with a unique index on
`(TenantId, NameNormalized)`, where `NameNormalized` is a stored, generated
column (`lower("Name")`) — both filtered to `"DeletedAt" IS NULL` exactly as
before. This means two concurrent requests that both pass the
application-level `NameExistsAsync` pre-check before either commits can no
longer both succeed: the second `SaveChangesAsync` now fails with a Postgres
`unique_violation` (SQLSTATE `23505`).

`ServicesService.Infrastructure.Persistence.UnitOfWork.SaveChangesAsync`
catches that specific `DbUpdateException`/`PostgresException` combination and
rethrows a provider-agnostic `DuplicateEntityException`
(`Application/Abstractions/`) — Application and the six Create/Update
handlers catch that and return `Error.Conflict`, never referencing Npgsql
directly. `NameExistsAsync` remains as a cheap pre-check for the common case
(no round trip wasted persisting an entity that's obviously a duplicate); the
database index is what actually guarantees uniqueness under concurrency.

Migration: `20260721121859_AddCaseInsensitiveUniquenessAndCategoryLimits`.

### Structured validation errors (section 9 of the review brief)

`Admin.SharedKernel.Error` gained an optional
`IReadOnlyDictionary<string, IReadOnlyList<FieldError>>? FieldErrors`
(`FieldError` = `Code` + `Message`). `Dispatcher.ValidateAsync` now groups
every FluentValidation failure by `PropertyName` into that dictionary instead
of joining every message into one string. `ResultExtensions.ToActionResult`
renders a validation error carrying `FieldErrors` as a structured
`ProblemDetails` with `code` and a per-field `errors` map (each entry an
array of `{code, message}`); every other error type (`NotFound`, `Conflict`,
`Forbidden`, `Failure`, or a validation error with no `FieldErrors`) renders
exactly as before via `controller.Problem(...)`. This is a shared-kernel
change, so it applies to `identity-service` too — its one validator
(`ProvisionTenantCommandValidator`) now also gets structured field errors,
which is a strict improvement, not a behavior change it relies on.

### Monetary precision (section 10 of the review brief)

`CreateServiceCommandValidator`/`UpdateServiceCommandValidator` add
`.PrecisionScale(10, 2, ignoreTrailingZeros: true)` on `Price` and
`.PrecisionScale(5, 2, ignoreTrailingZeros: true)` on
`MaxDiscountPercentage`, matching the EF column precision
(`decimal(10,2)`/`decimal(5,2)`) that already existed. A request with more
than 2 decimal places is now rejected with `400` instead of being silently
rounded by the database.

### Field limits (resolved by explicit project-owner decision, not inferred)

`Category.NameMaxLength` drops from 100 to **60** and `Service.NameMaxLength`
from 100 to **80**, aligning the backend (Domain constant, EF column,
migration) to the admin-frontend's existing values instead of the reverse —
neither `docs/API.md` nor `docs/DOMAIN.md` fixed a number for either field,
so this was confirmed with the project owner rather than chosen silently.
`Tag.NameMaxLength` (40) was already consistent on both sides and is
unchanged.

## Consequences

- `CreateTagCommandValidator`, `CreateCategoryCommandValidator`,
  `CreateServiceCommandValidator`, `UpdateTagCommandValidator`,
  `UpdateCategoryCommandValidator`, `UpdateServiceCommandValidator` no longer
  take repository dependencies and contain only shape/format/precision
  rules.
- `DeleteTagCommandValidator`/`DeleteCategoryCommandValidator`/
  `DeleteServiceCommandValidator` shrink to a single `NotEmpty` id check;
  existence and in-use checks moved to their handlers.
- `Tag`, `Category`, `Service`, `TagColor` throw again:
  `InvalidTagException`, `InvalidCategoryException`, `InvalidServiceException`
  are back in `ServicesService.Domain/Exceptions/` (the first pre-existed in
  git history before ADR 0011 deleted it; the latter two are new but follow
  the exact same shape).
- Every validator/handler unit test that asserted the old split (existence
  in the validator test, not the handler test) moved back to the handler
  test, and domain-level throw tests (`CategoryTests`, `ServiceTests`,
  `TagTests`, `TagColorTests`) are restored alongside the validator's
  equivalent shape-rule test — both layers are tested again, deliberately.
- Handler tests now also assert the query is made exactly once (e.g.
  `repository.Received(1).GetByIdAsync(...)`) and that a rejected
  create/update does not call `Add`/`SaveChangesAsync`/`GetNextCodeAsync`.
- Integration tests (`TagsEndpointTests`, `CategoriesEndpointTests`,
  `ServicesEndpointTests`) updated: duplicate-name assertions now expect
  `409`, unknown-id assertions now expect `404` (a cross-tenant update reads
  as unknown, not a 400 shape error, since the tenant query filter hides the
  other tenant's row entirely). New tests cover: reusing a soft-deleted
  entity's name, a structured multi-field validation error, and monetary
  precision rejection.
- `backend/CLAUDE.md`'s FluentValidation/Result-pattern/Rich-domain-model
  sections, which ADR 0010/0011 had updated to describe the (now reverted)
  validator-owns-cross-aggregate-checks convention, are updated back to
  describing this ADR's convention — matching `identity-service`'s `Tenant`
  pattern as the repo-wide default, with no more services-service exception
  called out.
- This does not reopen ADR 0005's "MediatR/FluentAssertions not used here"
  decision, ADR 0006's tenant-scoping mechanism, ADR 0008/0009's automatic
  tenant assignment, or ADR 0007's command-binding/mapping-extension
  conventions — none of those are touched by this change.
