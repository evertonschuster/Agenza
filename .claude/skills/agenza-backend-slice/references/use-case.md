# Use case — request, validator, mapping, handler, response

Rules: [ARCHITECTURE §2, §4, §6, §7](../../../../backend/docs/ARCHITECTURE.md#2-anatomy-of-a-feature).
Code to copy: §10 rows "Handler…", "Orchestration owned by the handler", "Validator codes and
messages", plus the earlier slices for reads, edits and paging. This file is how to write each piece.

## 1. The request — the input DTO

- `<Verb><Noun>Command` changes state; `<Verb><Noun>Query` only reads. A positional `sealed record`
  implementing `ICommand`, `ICommand<TResponse>` or `IQuery<TResponse>`.
- Members are what crosses the wire: primitives, strings, `DateOnly?`, `Guid`, and lists as
  `IReadOnlyList<<Thing>Input>?`, with the `<Thing>Input` records in the same file. No domain type —
  except a shared string value object such as `CpfNumber?`, which binds from the JSON string and needs
  no validator rule (ADR 0055) — no tenant, no C# enum: an enum travels as a string and
  `<Concept>Names` translates it.
- A route id is a member (`<Entity>Id`) that the controller fills with `with { … }`.
- A list query carries its filters as optional members and `Page`/`PageSize` with defaults.

## 2. The validator — simple and clean

One `AbstractValidator<T>` per request that carries input, queries included. Write it as a list of
facts about the input, one `RuleFor` per property:

- Every rule ends in `.WithErrorCode(…)` and `.WithMessage("…")`. The code is the domain's
  (`Client.TooManyGuardians.Code`); a rule with no domain counterpart — an empty route id, a missing list
  item — still gets a `<Type>.<Rule>` code, as a literal in the validator. The message is pt-BR, names
  the field, and interpolates limits from the domain's constants.
- `.Cascade(CascadeMode.Stop)` when a later rule assumes an earlier one held (the length check after
  the not-empty check).
- An optional field's rule tolerates blank (`string.IsNullOrWhiteSpace(x) || …`) or sits under
  `.When(…)`.
- A rule across fields is attached to the property the user has to fix
  (`.OverridePropertyName(…)`), or delegates to the value object's predicate.
- A list: cap its count first; then `RuleForEach(…).NotNull().SetValidator(new <Thing>InputValidator())`
  under `.When(count is within the cap)`, so an oversized list is not validated item by item. The item
  validator is a `sealed class` in the same file.
- Rules that need "today" inject `TimeProvider` and compute it in a local `Today()`.
- A rule used by two validators moves to `<Feature>RuleBuilderExtensions` as `MustBeValid<Thing>()`.

Never in a validator: `async` rules, a repository, the `DbContext`, existence or uniqueness, a call to a
value object's `Create` to decide (the validator restates the rule and reuses the code — ADR 0044), a
base validator class.

## 3. The mapping — `ToModel` / `ApplyTo`

`<Operation>CommandExtensions`, a static class next to the command:

- `ToModel(this <Command>, <context the handler resolved>)` → `DomainResult<<Entity>>`: build each
  value object with `Create`, return on the first failure, mint the root's id, call the root's `Create`
  with the value objects and the children's data records.
- `ApplyTo(this <Command>, <Entity>, <context>)` → `DomainResult`: build the value objects, call the
  behaviour.
- Helpers named `To...` with a natural source object are extension methods and are called from that
  object. Keep domain factories such as `Create` and `Restore` as static methods.
- No rule, no I/O, no tenant. Each step is an explicit `if (x.IsFailure) return …` — no helper chains
  them.

## 4. The handler — one use case

A `sealed class` implementing the handler contract. It depends only on ports from `Abstractions/`,
`TimeProvider` and `ILogger<T>` — never the `DbContext`, `IDispatcher`, another handler, `HttpContext`
or `ITenantAccessor`.

`Handle` reads as these seven steps, which walk gates 3 to 5 of ARCHITECTURE §4 (binding and the
validator already ran before the handler):

1. Resolve context: `today` from `TimeProvider`.
2. Get the aggregate: `ToModel` for a create; the repository plus `NotFound` for anything else.
3. A domain failure returns `error.ToApplicationError()`.
4. Pre-checks against current state, cheapest first and before any side effect: each a private
   `Find<Thing>ConflictAsync` returning `Error?`; a conflict a form can show is keyed by field, with
   `meta`; one per answer.
5. Behaviour, or `Add`.
6. `SaveChangesAsync`; a failure logs kind and constraint at `Warning` and returns
   `<Entity>.SaveFailed`.
7. Return `<Entity>Response.From<Entity>(…)`.

A query handler: read through the repository → `NotFound` or map. When the response shows another
aggregate, collect its ids from the page, read them in one call through that aggregate's repository,
and hand what you need to `From<Entity>`.

Where shared logic goes:

| Two handlers share… | It goes to |
| --- | --- |
| a rule | the domain |
| a read | a repository method |
| an input rule | `<Feature>RuleBuilderExtensions` |
| a mapping to the wire | `<Entity>Response.From<Entity>` |
| a few lines of orchestration | stays repeated in each handler |

No `try/catch`, no base class, no loader or service class between handlers.

## 5. The response — the output DTO

- `<Entity>Response`, a `sealed record`, born in the operation folder and moved to the feature root
  when a second operation returns it.
- `public static <Entity>Response From<Entity>(<Entity> entity, …)`: a value object becomes its
  `.Value` (`?.Value` when optional), an enum its camelCase wire name, each child its own
  `<Child>Response.From<Child>`, another aggregate an `<Other>Summary(Id, Name, …)` built from what the
  handler read.
- The DTO decides nothing. A derived value the interface needs is exposed by the domain and copied
  here.
- A paged read returns `PagedResult<<Entity>Response>`.

## 6. Red flags in a use case

- a domain type (other than a shared string value object) or a C# enum in a command, an input or a response
- `TenantId` anywhere in the request, the mapping or the handler
- an async rule, a repository or a uniqueness check in a validator; a rule without `.WithErrorCode`
- `try`/`catch` in a handler; a handler that injects the `DbContext` or calls another handler
- a class named `…Loader`, `…Manager`, `…Service`, `…Helper` used by handlers
- the mapping doing I/O or deciding a rule; a response computing business logic
- several conflicts in one answer; a field conflict without the field key
