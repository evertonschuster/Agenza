# ADR 0010 — Cross-aggregate checks move into FluentValidation validators

Status: accepted (2026-07)

## Context

ADR 0005 drew the line for FluentValidation at cheap, synchronous shape
rules (required, length, enum/palette membership); anything needing a
repository round-trip — name uniqueness, existence of a related
aggregate — stayed as an inline `if (...) return Result.Failure(...)`
block at the top of the command handler.

With three verticals (Tags, Categories, Services) each carrying a
Create/Update pair, this produced repetitive, boilerplate-heavy
handlers: `CreateTagCommandHandler`, `CreateCategoryCommandHandler`,
`CreateServiceCommandHandler`, and their Update counterparts, all opened
with one or more near-identical existence/uniqueness checks before doing
any real work. `UpdateServiceCommandHandler` in particular had grown to
three separate `if`/`return Result.Failure` blocks (service existence,
category existence, tag existence) before it ever touched the entity
being updated. The checks were correct but crowded out the handler's
actual job — construct or apply, persist, return — and the same
duplicate-name/not-found shape was retyped per vertical instead of
expressed once as a rule.

## Decision

Cross-aggregate rules that need a repository round-trip (uniqueness,
existence) move into the command's FluentValidation validator as async
`MustAsync` rules, with the relevant repository interface(s)
constructor-injected into the validator. Handlers become pure
orchestration: fetch what's needed → construct/apply → persist → return.
This applies to all six Create/Update validator+handler pairs across
Tags, Categories, and Services — not just new code, the existing
handlers were refactored to match.

Each moved rule still calls `.WithErrorCode("Entity.SpecificCode")` (e.g.
`Tag.DuplicateName`, `Category.NotFound`, `Service.DuplicateName`,
`Tag.NotFound`) even though nothing reads it today (see trade-off
below) — cheap to keep, and it documents intent/keeps the door open for
a future Dispatcher change to honor it.

An Update handler that no longer performs its own existence check
still needs the entity, so it re-fetches by id and asserts non-null with
`!` — a one-line comment (`// Existence already guaranteed by
Update<X>CommandValidator.`) marks this as a deliberate, validator-backed
invariant rather than a missing null check, per `backend/CLAUDE.md`'s
comment policy for non-obvious ordering constraints.

`UpdateServiceCommandHandler`'s `TagIds is not null` (not `Count: > 0`)
check — which lets an explicitly empty array clear a service's tags
while `null` leaves them untouched — stays in the handler, because it
drives which entity-mutating branch runs (`SetTags` or not), not just a
validation outcome. The validator's own `TagIds` rule mirrors the same
`null`-vs-`empty` distinction via `.When(...)` so that clearing tags
(`TagIds: []`) still passes validation.

### Accepted trade-off: loss of distinct 404/409 status codes

`Admin.SharedKernel/Dispatcher.cs`'s `ValidateAsync` collapses *any*
FluentValidation failure — shape or cross-aggregate — into a single
generic `Error.Validation("Validation.Failed", <joined messages>)`. It
does not inspect FluentValidation's `ErrorCode` or `Severity`. Before
this change, a duplicate name produced a 409 Conflict and a missing
related entity produced a 404 NotFound; after this change, both produce
a 400 Bad Request with a message string, indistinguishable at the HTTP
layer from "the name was empty."

This was raised and explicitly accepted: the value of consolidating
repetitive handler `if`/`return` blocks into declarative validator rules
was judged worth losing the specific status codes for *these particular
checks*. The Dispatcher was deliberately left unchanged — teaching it to
read FluentValidation's `ErrorCode`/`Severity` and map them back to
`ErrorType.Conflict`/`ErrorType.NotFound` was considered and declined
for this change, to keep the refactor scoped to the six validator/handler
pairs rather than touching shared CQRS infrastructure.

## Consequences

- `CreateTagCommandValidator`, `CreateCategoryCommandValidator`,
  `CreateServiceCommandValidator`, `UpdateTagCommandValidator`,
  `UpdateCategoryCommandValidator`, and `UpdateServiceCommandValidator`
  now take repository dependencies in their constructors and contain
  `MustAsync` rules alongside their shape rules.
- The corresponding handlers dropped their inline existence/uniqueness
  `if` blocks; `Create*CommandHandler.Handle` is now construct → persist
  → return, and `Update*CommandHandler.Handle` is fetch (validator-backed
  non-null) → apply → persist → return.
- Every validator unit test that calls the synchronous `Validate(...)`
  had to move to `await validator.ValidateAsync(...)`, because
  FluentValidation throws `AsyncValidatorInvokedSynchronouslyException`
  when `Validate()` is called on a validator containing any `MustAsync`
  rule — even for a test exercising an unrelated sync rule. Each test's
  setup now constructs the validator with NSubstitute repository
  fakes, stubbing the happy path (`NameExistsAsync(...).Returns(false)`,
  `GetByIdAsync(...).Returns(someEntity)`) as the default so pure
  shape-rule tests aren't tripped up by an unrelated async rule failing
  first.
- Duplicate-name/not-found test cases that used to live in
  `*CommandHandlerTests` (e.g. `Handle_WithUnknownCategoryId_ReturnsNotFound`,
  `Handle_RenamingToAnotherServicesName_ReturnsConflict`) moved to the
  corresponding `*CommandValidatorTests`, asserting `result.IsValid` is
  `false` and `result.Errors` contains the expected `ErrorCode`, instead
  of asserting on a handler-returned `Result`.
- Superseded part of ADR 0005: the "FluentValidation for input shape,
  not business rules" decision (rules needing a repository round-trip
  "stay in the handler") no longer describes the codebase's convention
  for the Tags/Categories/Services verticals. `backend/CLAUDE.md`'s
  FluentValidation section is updated to describe the new default.
- If a future consumer needs distinct 404/409 responses for these
  checks, the fix belongs in `Admin.SharedKernel/Dispatcher.cs`'s
  `ValidateAsync` (reading `ErrorCode`/`Severity` off each
  `ValidationFailure`), not in reverting individual validators back to
  handler-level checks.
