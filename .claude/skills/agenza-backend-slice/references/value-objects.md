# Shared value objects

Rules: [ARCHITECTURE §3](../../../../backend/docs/ARCHITECTURE.md#3-domain) ("Shared value objects") and
[ADR 0055](../../../../docs/adr/0055-shared-string-value-objects.md). This file is the decision and the
order of work; it does not repeat the rules. A value object of one service is [domain.md](domain.md) §2.

## 1. Shared, or the service's own?

Ask in order and stop at the first no:

1. **Is it a string or a date?** The two contracts are `IStringValueObject<T>` and `IDateValueObject<T>`.
   Several values (`DurationRange`), a closed set (`TagColor`), a number or money stay in the service
   with `Create` → `DomainResult`. A third contract is a new decision: an ADR first.
2. **Is the format and the normalization the same in every service, with no business context?** A CPF
   is; a tag colour is not. A rule that belongs to one context is the service's own.
3. **Does a second service use it?** ARCHITECTURE §1 says anything added to a shared project lands in every
   service and "needs a second real caller, not an anticipated one"; ADR 0055 shares a type because its
   format is the same everywhere. If only one service uses it today, say so in the PR.
4. **Is it a scalar member of a JSON request body?** That is the only place the kernel binds it. A route or
   a query does not bind it (ADR 0055), and a list of them is untested.

## 2. Order of work

1. **The type**, in `backend/shared/Admin.SharedKernel.ValueObjects/`: a `sealed record` with a private
   constructor, implementing `IStringValueObject<Self>` (or `IDateValueObject<Self>`).
   - `Create(raw)` returns a `ParseResult<Self>`: trim and normalize, then validate; one pt-BR message per
     rule, and a message never carries the value (it reaches the logs and the client).
   - `Create(null)`, `""` and whitespace must fail — the converter takes the message of a non-string
     token from `Create(null)`.
   - `Restore(stored)` only rebuilds; no rule runs. Limits are `public const`.
   - `BlankIsAbsent` stays `true` (blank binds to `null`, so the member is nullable). Declare `false` only
     for a required member that should answer with its own message (`FullName`).
   - A date takes `today` as a parameter (`Create(date, today)`); the type never reads the clock.
   - Implement `Create` and `Restore` as public static members. An explicit interface implementation
     compiles, but the EF converter looks them up by name and fails when the model is built.
2. **Its tests**, in `backend/shared/Admin.SharedKernel.Tests/<Type>Tests.cs`: every rule with its message,
   every normalization, one under / exact / one over for each limit, `Restore` without validation.
   `StringValueObjectContractTests` already runs `Create(null/""/whitespace)` on every string type of
   the project; there is nothing to register. A date type has no such test.
3. **The command or input**: the member is `Type` (`Type?` when optional). The validator loses the rule it
   had, `ToModel` makes no call for it, and the EF configuration keeps only `HasMaxLength` (with the
   type's length constant) and `IsRequired`.
4. **The service**, once per service: its Domain references `Admin.SharedKernel.ValueObjects`; the MVC setup
   calls `.AddWireJson()`; the OpenAPI setup calls `MapValueObjectsToStrings()`; the `DbContext`
   calls `AddValueObjectConversions()` from `ConfigureConventions`. A service that has the three does
   nothing here.
5. **The wire test**: `<Operation>Command<Type>BindingTests` ([tests.md](tests.md) §1).
6. **Contract and docs**: the schema is an inline string (`format: date` for a date), so the frontend types
   stay the same — `npm run generate:api-types:check` in `apps/admin-frontend` confirms it. The places that
   list the shared types change with the list: grep an existing type's name over `docs/`, `backend/docs/`
   and `.claude/`.

## 3. What to remember

- Binding stops at the first invalid value, one field at a time. A missing or `null` member gets the
  framework's English "required" message before the type runs.
- A failed `Create` reaches the client as the message of a `JsonException` under the field, with code
  `Validation.Failed` (`docs/API.md` §4.3). The type has no `DomainError`, and the validator does not
  repeat its rules.
- The EF convention covers only the types of `Admin.SharedKernel.ValueObjects`; JSON and OpenAPI
  recognize any type that implements the contract. Keep the type in that project.
- Rejected in ADR 0055 — do not bring back: `IParsable`, `Parse` or `TryParse`; a `DomainResult` or
  `DomainError` in the type; a converter or `[JsonConverter]` per property; a `HasConversion` per column.
