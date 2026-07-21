# ADR 0011 — Tag/Category/Service become validated-by-the-validator, non-throwing domain entities

Status: superseded by docs/adr/0012 (2026-07) — accepted (2026-07); extends docs/adr/0010

> **2026-07 update:** reverted by docs/adr/0012. `Tag`, `Category`,
> `Service`, and `TagColor.From` throw again on invalid construction,
> restoring the defense-in-depth this ADR removed. This document is kept
> for historical context only — do not follow its "Decision" section for
> new code.

## Context

ADR 0005 drew a line where Domain entity constructors/`Update` methods
validated their own invariants and threw `BusinessException` subtypes
(`InvalidTagException`, `InvalidCategoryException`, `InvalidServiceException`)
on violation — justified as defense-in-depth on top of FluentValidation,
and as the only option available given Domain has zero project
references (so it can't use `Admin.SharedKernel`'s `Result` type).

ADR 0010 already moved every cross-aggregate rule (uniqueness, existence)
out of handlers and into the six Create/Update validators. After that
change, the remaining domain-level `Validate*` methods on `Tag`,
`Category`, and `Service` — name/description length, `TagColor` palette
membership, duration range/ordering, price, max-discount-percentage —
duplicated rules the corresponding validator already enforced. Auditing
all six validators confirmed every one of these shape rules was already
present as a `RuleFor` before this ADR: nothing new needed to be added to
the validators, only removed from Domain.

## Decision

`Tag`, `Category`, and `Service` (and `TagColor.From`) stop validating
anything and stop throwing. Their constructors and `Update` methods
become plain assignment plus data-hygiene normalization (trim strings,
collapse a blank description to `null`) — no guard clauses, no
`InvalidTagException`/`InvalidCategoryException`/`InvalidServiceException`.
Those three exception classes are deleted from
`ServicesService.Domain/Exceptions/`. `TagColor.From(string)` becomes:

```csharp
public static TagColor From(string value) => new(value.Trim().ToLowerInvariant());
```

FluentValidation is now the single source of truth for every rule these
entities used to enforce themselves — shape rules (required, length,
palette membership) and cross-aggregate rules (uniqueness, existence)
both live in `CreateTagCommandValidator`/`UpdateTagCommandValidator`/
`CreateCategoryCommandValidator`/`UpdateCategoryCommandValidator`/
`CreateServiceCommandValidator`/`UpdateServiceCommandValidator`. The
resulting invariant: **by the time any of these three constructors run,
the input has already passed full validation** — a handler only ever
constructs or updates one of these entities after the dispatcher's
`ValidateAsync` has succeeded.

This is scoped strictly to `Tag`, `Category`, and `Service` in
`services-service`. `identity-service`'s `Tenant` (and the shared
`InvalidTenantException` thrown by `TenantOwnedEntity.AssignTenant`) are
unaffected — a missing/invalid tenant is a scoping bug caught by
infrastructure (the save interceptor), not a validator-covered user
input, so it keeps throwing exactly as ADR 0005/0009 describe.

Entities keep their private setters and behavior methods that aren't
pure validation — `Service.SetTags` still exists as a real behavior
method, just with no invariant check inside it (tag existence is a
cross-aggregate rule already enforced by the validator before the
handler calls it).

### Why not keep the throw as defense-in-depth

The user explicitly wants both handlers and Domain free of
exception-based control flow for these three entities: a construction
that reaches Domain with invalid data now means "a validator/domain
mismatch bug", and that bug should surface as a normal unhandled
exception during development (still true — a genuine mismatch, e.g. a
handler that skips the validator, would throw a plain
`NullReferenceException`/`ArgumentException`/similar from whatever
Domain code trips over the bad value, not a custom `BusinessException`),
rather than paying for a second, now-redundant validation pass in
Domain on every request.

## Consequences

- `ServicesService.Domain/Exceptions/InvalidTagException.cs`,
  `InvalidCategoryException.cs`, and `InvalidServiceException.cs` are
  deleted. `BusinessException.cs` and `InvalidTenantException.cs` are
  untouched — the Api's `BusinessExceptionHandler` still knows how to
  map any `BusinessException`, it just never sees these three subtypes
  again.
- `Tag`, `Category`, `Service` no longer have `Validate*` private static
  methods. Their constructors/`Update` are plain field assignment plus
  the pre-existing trim/null-out-blank-description normalization (kept —
  that's data hygiene, not rejection).
- Domain-level unit tests (`TagTests`, `CategoryTests`, `ServiceTests`,
  `TagColorTests`) that asserted throwing on invalid input were deleted;
  what remains is construction/`Update` round-trip coverage (the entity
  stores whatever it's given) plus the unrelated `AssignTenant`/
  `MarkCreated`/`MarkDeleted` behavior tests, which are unaffected.
- Handler-level unit tests that asserted a Domain exception propagating
  out of `Handle(...)` (e.g. `CreateTagCommandHandlerTests.Handle_WithInvalidColor_ThrowsAndDoesNotPersist`,
  `UpdateServiceCommandHandlerTests.Handle_WithInvalidDuration_ThrowsAndKeepsOriginalState`)
  were deleted — the corresponding validator test already covers the
  same input/rule combination (`CreateTagCommandValidatorTests.Validate_WithColorOutsidePalette_Fails`,
  etc.). One gap was found and closed while doing this:
  `UpdateServiceCommandValidatorTests` had no test for "duration outside
  the min/max range" even though the validator already enforced it and
  `CreateServiceCommandValidatorTests` already had the equivalent test —
  `Validate_WithDurationOutsideMinMaxRange_Fails` was added to close it.
- `backend/CLAUDE.md`'s "Rich domain model" and "Result pattern" sections
  are updated: the "Domain still throws" framing now describes
  `identity-service`'s `Tenant` specifically, not a blanket rule, and
  `services-service`'s `Tag`/`Category`/`Service` are called out as the
  exception (pun intended) to that default.
- `.skills/backend-use-case/SKILL.md`'s Widget template still shows
  Domain throwing on invalid input as the **default recommendation for a
  brand-new service** — a new service's entity may still want
  Domain-level defense-in-depth before it has a full validator suite
  built out. The template gets a short note pointing here rather than
  being rewritten, since this ADR is a deliberate deviation for three
  specific, already-mature entities, not a new repo-wide default.
- If a future service reaches the same point services-service did here
  (every Domain invariant already duplicated in a validator), the same
  deletion is a reasonable follow-up ADR for that service — this one
  doesn't pre-approve it, each service's Domain/Application maturity is
  judged independently.
