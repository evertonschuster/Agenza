# ADR 0055 — String value objects shared by every service, in `Admin.SharedKernel.ValueObjects`

Status: accepted (2026-10); amends [ADR 0001](0001-context-aggregated-services.md) (shared code is infrastructure only)
and item 8 of [ADR 0049](0049-conventions-for-new-backend-slices.md) (a command carries no domain type) **for these
types only**; they do not use `DomainResult`/`DomainError` of [ADR 0014](0014-result-pattern-domain-and-persistence-no-exceptions.md)

## Context

A CPF is the same value in every service and on the wire. `CpfNumber` lived in `ServicesService.Domain`, and carrying it
as a typed member of `CreateClientCommand` (the way a `Guid` or a `DateOnly` is carried) took four per-service steps:
a JSON converter in Application, its registration, a schema case in the OpenAPI setup, and a `HasConversion` for each
column. A second service would have copied the type and repeated the four steps, for each value object it wanted to
type the same way.

## Decision

1. **A project with no reference at all**, `backend/shared/Admin.SharedKernel.ValueObjects`. A service's Domain may
   reference it and nothing else, so Domain still depends on no package and no other project. It holds the value objects
   that carry no business context — a format and a normalization that are the same in every service (CPF today; e-mail
   and phone are candidates). A value object that belongs to one context stays in that service's `Domain/ValueObjects/`
   with `Create` and `DomainResult`.

2. **They behave like a scalar** (`Guid`, `DateOnly`) on the wire, not like the service's own value objects. The
   contract `IStringValueObject<T>` is `Value`, `Create(string?)` and `Restore` (rebuilds a stored value without
   validating). `Create` returns a `ParseResult<T>`: the value, or the pt-BR message of the rule that failed — a type
   with several rules has a message for each. There is no `Parse` and no `TryParse`, and no `DomainResult` or
   `DomainError`: both are per-service types, and a code is not needed here, since a binding failure always answers
   `Validation.Failed`. Blank is not a value: `Create(null)`, `Create("")` and whitespace fail, and the member is
   nullable when the field is optional.

3. **The kernel applies the contract once**, so a new value object in that project works everywhere with no per-service
   code:
   - `JsonSerializerOptions.AddValueObjectConverters()` (`Admin.SharedKernel`): a JSON string in, any formatting the type
     accepts; `null`, `""` and whitespace bind to `null`; anything else throws a `JsonException` carrying the `Error` of
     the result — for a token that is not a string, the `Error` of `Create(null)` — and never the value (it is personal
     data and the message reaches the logs, so a type's errors must not echo it).
   - `OpenApiOptions.MapValueObjectsToStrings()` (`Admin.SharedKernel.AspNetCore`): the schema is an inline `string`
     (nullable when the member is), with no schema of its own, so the generated frontend types do not change.
   - `ModelConfigurationBuilder.AddValueObjectConversions()` (`Admin.SharedKernel.EntityFrameworkCore`), called from
     `ConfigureConventions`: a `string` column. The column's length stays in the entity configuration
     (`HasMaxLength(CpfNumber.Length)`).

4. **A command or an input may carry such a value object** (`CpfNumber? Cpf`). The validator no longer restates its
   rule and `ToModel` makes no call for it: an invalid value never gets past model binding. The failure reaches the
   client through the shared `AddModelStateProblemDetails`, under the field, with the converter's own message.

5. **Tests live with the kernel.** `Admin.SharedKernel.Tests` covers the types and the pieces, with its own coverage
   gate; the services' gates exclude `Admin.SharedKernel.ValueObjects` the way they already exclude
   `Admin.SharedKernel`. The service tier keeps one test per command that proves its wire contract
   (`CreateClientCommandCpfBindingTests`).

## Consequences

- Adding a value object: one type in the project and its tests; a service picks it up by calling the three extensions it
  already calls. `ARCHITECTURE.md` §3 carries the recipe.
- `Create` must fail on null and blank, because the converter takes the message of a non-string token from
  `Create(null)`. `StringValueObjectContractTests` checks it for every type in the project.
- Without `IParsable<T>` a shared value object does not bind from a route or a query. MVC on .NET 10 does bind an
  `IParsable` type there (probed: it calls `TryParse`, never `Parse`), but with its own English message that echoes the
  value; a CPF in a URL is not wanted.
- `Admin.SharedKernel.AspNetCore` now references `Microsoft.AspNetCore.OpenApi`, whose source generator adds a generated
  file to that assembly; the kernel's test project excludes that file from coverage.
- A converter can only reject by throwing, so a binding failure is a `JsonException` — the same mechanism the
  framework's own `Guid` and `DateOnly` converters use. [ADR 0014](0014-result-pattern-domain-and-persistence-no-exceptions.md)
  asks that expected outcomes be values; this ADR does not change that, and the tension is left open here.
- Only optional (nullable) members have been exercised. A required member typed as a value object, where `""` would bind
  to `null`, has not.
- A rule that takes a parameter (`BirthDate` needs today) or a value that is not a string does not fit the contract and
  stays in the service.

## Considered and rejected

- **A copy per service**, the stance of [ADR 0006](0006-tenant-header-base-entity-generic-repository.md) and
  [ADR 0014](0014-result-pattern-domain-and-persistence-no-exceptions.md) for `BaseEntity` and `DomainResult`. It stays
  the rule for context-specific value objects. For a generic one it copies the check-digit algorithm and the wire plumbing
  into every service.
- **A NuGet package.** One solution, no feed, no publishing pipeline; a version per change would buy nothing over a
  `ProjectReference` that changes together with its consumers.
- **Moving `DomainResult`/`DomainError` into the shared project**, so the value objects keep `Create → DomainResult`. It
  touches about forty files in two services, amends ADR 0014, and the only reader of the failure is the converter.
- **`IParsable<T>`** (`TryParse`, `Parse`), the first version of this contract. `Parse` had no caller — the converter and
  EF never call it and MVC calls only `TryParse` — and `TryParse` returns no message, so a type could carry only one
  fixed message.
- **`TryParse(raw, out value, out string? error)`.** One message per rule with no result type. `ParseResult<T>` was
  chosen so that a failure travels the way the services' own `DomainResult` does, and can carry more than a message
  later without changing the shape of the contract.
- **One converter class per value object, with `[JsonConverter]` on each property** — the first version of the CPF spike.
  One class, one registration and one schema case per type per service, and an attribute that `Guid` and `DateOnly` never
  needed. Replaced by the contract.
