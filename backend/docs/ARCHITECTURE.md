# Backend — Architecture

How every .NET service under `backend/` is built and **why it looks the way it does**. This is the
current rulebook. The reasoning, the alternatives and the history live in the ADRs
([index](../../docs/adr/README.md)); this file states the result and links to them. When an ADR's
status header and this file disagree, the ADR wins and this file gets fixed.

It describes **shapes, not features**. No section lists which entities, endpoints or verticals
exist — that is the code (`<Service>.Application/<Feature>/`) and the OpenAPI document. A sentence
that starts with "today only X does Y" is stale on the next merge; don't write one here.

Three rules of thumb behind everything below:

- **Abstraction proportional to the problem.** Lean plumbing — one hand-rolled dispatcher, explicit
  mapping methods, explicit `if (x.IsFailure) return …`. Invested domain — aggregates, value objects,
  named errors.
- **One source of truth per rule.** A rule lives where it is enforced and everything else reuses it:
  the domain's constants and error codes feed the validator and the EF configuration; the database
  index is the last word on uniqueness; the token claim is the only tenant.
- **The simplest correct form first.** A command loads the aggregate, changes it through behaviour and
  saves; a query loads and maps. Caching, projections inside repositories, raw SQL, hand-opened
  transactions, gap-free sequences, denormalized columns and parallel queries need a measured problem or
  a product rule, stated in the PR — and an ADR when they add a mechanism. Not a query per row, and
  `AsNoTracking` on pre-check lookups, are shape rather than optimization and stay required
  ([0049](../../docs/adr/0049-conventions-for-new-backend-slices.md)).

Placeholders: `<Service>` is the project prefix (`ServicesService`), `<Feature>` a plural noun
folder (`Clients`), `<Operation>` a verb + noun (`CreateClient`), `<Entity>` the aggregate
(`Client`).

---

## 1. Shape

### Services

Services are **context-aggregated** ([ADR 0001](../../docs/adr/0001-context-aggregated-services.md)):
a small monolith per business context. A capability that fits an existing context is a new
`<Feature>/` folder in that service, not a new service. Splitting a context out is an ADR, not a PR
detail. Each service owns its schema, its migrations history, its database role and its API
([0002](../../docs/adr/0002-shared-postgres-schema-per-service.md),
[0017](../../docs/adr/0017-schema-scoped-migrations-history-table.md),
[0024](../../docs/adr/0024-database-enforced-data-ownership.md)); services talk over HTTP with tokens,
never through each other's tables.

`services-service` is the template for a **tenant-owned business context**. `identity-service` is
the OIDC provider and is shaped by that — ASP.NET Identity, no tenant-owned entities, a unit of work
that wraps two stores in one transaction. Don't carry its specifics into a business service.

A new service copies the project set below, the per-service `Domain/Common/` types, a schema and a
role in `infra/postgres/init/`, a schema-scoped migrations history table, and an AppHost resource;
it registers `TenantHeaderFilter` if it serves tenant-owned resources. `AddServiceDefaults()` already
brings logging, telemetry and health checks, so there is nothing to copy for them. Use the live services
as the template, not a copied snippet ([`docs/MONOREPO.md`](../../docs/MONOREPO.md)).

### Projects and dependency direction

```
<Service>.Domain            entities, value objects, DomainResult        no project or package reference
<Service>.Application       use cases, ports in Abstractions/            → Domain, Admin.SharedKernel
<Service>.Infrastructure    EF Core, repositories, adapters              → Application, Admin.SharedKernel.EntityFrameworkCore, Admin.Identity.Client
<Service>.Api               controllers, Program.cs, Setup/              → Application, Infrastructure, Admin.SharedKernel.AspNetCore, ServiceDefaults
<Service>.Tests             unit tests                                   → Domain, Application
<Service>.PersistenceTests  EF InMemory, only where tenant EF behaviour needs proof → Infrastructure
```

The `.csproj` references **are** the enforcement: Application cannot see EF Core or ASP.NET Core
because it does not reference them. A reference that crosses this direction is a design change.

Shared projects in `backend/shared/` hold infrastructure, never business rules:

| Project | Holds | Referenced by |
| --- | --- | --- |
| `Admin.SharedKernel` | `Result`, `Error`/`ErrorType`/`FieldError`, CQRS contracts, `IDispatcher`, `PagedResult` | Application |
| `Admin.SharedKernel.AspNetCore` | `ToActionResult`, `ApiResponse<T>`, `ApiProblemDetails`, `AgenzaControllerBase`, `GenericExceptionHandler` | Api |
| `Admin.SharedKernel.EntityFrameworkCore` | `RepositoryBase<T>`, `ApplyAuditableConventions` (soft-delete and tenant filters) | Infrastructure |
| `Admin.Identity.Client` | JWT validation, `ITenantAccessor`, `ICurrentUserAccessor`, `TenantHeaderFilter`, `[IgnoreTenant]` | Infrastructure, Api |
| `Admin.Logging` | the Serilog pipeline: console format, default levels, OTLP export, one line per request | `ServiceDefaults`, `AppHost` — never a layer |

`BaseEntity`, `TenantOwnedEntity`, `DomainResult` and `DomainError` are **duplicated per service on
purpose** — Domain references nothing, so it cannot share them
([0006](../../docs/adr/0006-tenant-header-base-entity-generic-repository.md),
[0014](../../docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md)).

Anything added to a shared project lands in every service. It needs a second real caller, not an
anticipated one.

## 2. Anatomy of a feature

Vertical slices organise the Application layer; they do not replace the layers
([0005](../../docs/adr/0005-cqrs-vertical-slice-result-pattern.md)).

```
<Service>.Domain/
  Common/                                  BaseEntity, TenantOwnedEntity, DomainResult, DomainError
  Entities/                                aggregate roots, their children, their enums
  ValueObjects/
<Service>.Application/
  Abstractions/                            ports: I<Entity>Repository, IUnitOfWork, ICurrentTenantProvider;
                                           DomainErrorMapper; PersistenceResult
  <Feature>/
    <Entity>Response.cs                    wire DTO with a static From<Entity>(…), shared by the operations
    <Feature>RuleBuilderExtensions.cs      validator rules used by more than one validator — when needed
    <Concept>Names.cs                      wire string ↔ domain enum translation — when needed (§6)
    <Operation>/
      <Operation>Command.cs | Query.cs     a record; nested input records live in the same file
      <Operation>CommandHandler.cs | QueryHandler.cs
      <Operation>CommandValidator.cs | QueryValidator.cs      whenever the request carries input
      <Operation>CommandExtensions.cs      ToModel(…) / ApplyTo(entity): command → domain calls
<Service>.Infrastructure/
  Persistence/Configurations/<Entity>Configuration.cs
  Persistence/Migrations/
  Repositories/<Entity>Repository.cs
  DependencyInjection.cs                   registers each repository and adapter
<Service>.Api/Controllers/<Feature>Controller.cs
<Service>.Tests/<Feature>/                 tests of the feature's entities and value objects
<Service>.Tests/<Feature>/<Operation>/     handler, validator and binding tests
```

- Handlers and validators are registered by assembly scan; never by hand, never through a mediator
  library. Repositories and adapters are registered in Infrastructure's `DependencyInjection.cs`.
- A type is born in its operation folder and moves to the feature root when a second operation needs
  it — not before.
- `ToModel`/`ApplyTo` keep the handler reading as orchestration; the mapping only calls the domain's
  public factories and behaviour, it adds no rule
  ([0007](../../docs/adr/0007-direct-command-binding-and-mapping-extensions.md)).

**A use case owns its orchestration**
([0049](../../docs/adr/0049-conventions-for-new-backend-slices.md)). One handler per operation, no base
handler, and no class between handlers that orchestrates — no loader, manager, service or helper. What
two handlers share has a home: a rule goes to the domain, a read to a repository method, an input rule
to `<Feature>RuleBuilderExtensions`, a mapping to `<Entity>Response.From<Entity>`. A few orchestration
lines repeated between the create and the edit of the same aggregate are accepted.

**Inputs and outputs are explicit records.** The input is the command or query record itself and its
nested `<Thing>Input` records: primitives, strings, `DateOnly`, ids — no domain type, no tenant. The
output is `<Entity>Response` with a static `From<Entity>(entity, …)`, built from the aggregate plus what
the handler read explicitly for it; another aggregate appears as a small `<Entity>Summary`. Value
objects flatten to their primitive, enums to camelCase strings. No mapping library, no DTO in the
domain, no entity past the handler.

## 3. Domain

**Aggregate roots.** Inherit `TenantOwnedEntity` (tenant-owned) or `BaseEntity`. The constructor is
private; `public static DomainResult<T> Create(…)` validates and builds; behaviour methods return
`DomainResult` and validate every new value before assigning any, so a failure never leaves a
half-updated entity. Setters are private. A private parameterless constructor exists for EF only.

**Aggregates reference each other by id**
([0049](../../docs/adr/0049-conventions-for-new-backend-slices.md)). A root holds another root's id,
never a navigation to it, and loads only its own children. A many-to-many between aggregates is a child
of the owning root holding the other's id, keyed `(TenantId, OwnerId, OtherId)` with composite foreign
keys to both.

**Behaviour has intention.** A state transition, or a change to a part of the aggregate with its own
rule, is a named method (`Inactivate()`, `ReplaceContacts(…)`) that refuses an invalid transition with a
named error. A whole-record `Update(…)` is acceptable for an edit form over free data with no
transition. A method that sets state without checking anything (`SetX`) does not exist.

**Factories are static methods on the type**: `Create` on roots and value objects, `internal static
Create` on children, `Restore` on value objects. No `<X>Factory` or builder classes and no public
constructors.

**Children** are created only by their root
([0044](../../docs/adr/0044-clients-aggregate-uniqueness-and-conflict-contract.md)): the root's
`Create` or behaviour method receives plain data records and builds each child through an `internal`
factory that receives the root's id. Children are exposed as `IReadOnlyCollection<T>` over a private
list, have no `DbSet`, and are read and written through the root. Nothing outside the domain can
create a child or move it to another root.

**Value objects** are `sealed record`s with a private constructor and:

- `static DomainResult<T> Create(raw)` — validates **and normalizes** user input (trim, case, mask).
  An optional value returns `Success(null)` for blank input.
- `static T Restore(stored)` — rebuilds a stored value without validating. EF conversions call it,
  so a row stays readable after a rule changes or after data is fixed outside the application.
- its limits as constants and its errors as `public static readonly DomainError`;
- pure predicates (`IsValid`, `HasValidShape`) when a validator needs the same check without
  building the value.

A value **is** a value object when it has a format or a normalization (CPF, e-mail, phone), a rule over
several values (a duration range), a closed set (a palette), a rule that needs a parameter (a birth date
and today), when it is money or a percentage, or when more than one type uses its rule. Free text bounded
only by its length (a name, a description) **may** stay a primitive, validated by its owner with a named
`DomainError`. The column stores the normalized value.

**Errors.** `DomainError(Code, Message)`, declared once per rule as `static readonly` on the type that
owns it. The code is `<Type>.<Rule>` and talks about the value, not about who uses it
(`CpfNumber.Invalid`, `Client.GuardianRequired`), so it can be reused elsewhere. Messages are pt-BR.

**Lifecycle.** "Deleted" is `BaseEntity`'s soft delete and nothing else: a repository `Remove`s, the
save interceptor stamps `DeletedAt`, the query filter hides the row, a deleted id answers 404. Never
add a `Deleted` status beside it. Other states are an enum on the entity, stored as text.

**What the domain does not know**: the tenant (assigned on save, §5), the wire format (§6), the clock
(`today` is a parameter, §7), persistence, and other aggregates — a rule that needs another aggregate
or the current state of the database belongs to the handler (§4). Ids are `Guid.CreateVersion7()`: a
root's by its caller (`ToModel`), a child's by its root.

## 4. Errors — one pipeline, five gates

Expected outcomes are values; only the unexpected throws
([0014](../../docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md)). Each gate owns a
different kind of rule:

| # | Gate | Owns | Answers |
| --- | --- | --- | --- |
| 1 | Model binding (framework) | JSON syntax and types | 400 in the framework's shape: English, no `code` |
| 2 | Validator, run by the dispatcher | input shape: required, length, format, range, list size, cross-field within the request | 400 `Validation.Failed`, `errors` keyed by property; the response writes each path in camelCase ([0051](../../docs/adr/0051-camelcase-error-keys-on-the-wire.md)) |
| 3 | Domain, `Create`/behaviour → `DomainResult` | the same invariants again, plus rules over the whole aggregate | 400 through `DomainErrorMapper`, the domain's code at the top and its message under the empty key |
| 4 | Handler | current state: existence, uniqueness, in use, other aggregates | `NotFound` 404, `Conflict` 409 |
| 5 | Unit of work, `PersistenceResult` | what the database rejected | 409 `<Entity>.SaveFailed`, generic |
| — | Anything else | — | exception → `GenericExceptionHandler` → generic 500 |

**Validator.** Synchronous; no repository, no I/O
([0012](../../docs/adr/0012-revert-cross-aggregate-checks-to-handlers-and-domain.md)). Every rule
carries the domain's code with `.WithErrorCode(<DomainError>.Code)` and its own pt-BR message naming
the field; limits come from the domain's constants. It restates the rule rather than calling the
domain to decide, and reuses the code, so a rule answers the same code whichever gate catches it. A
rule shared by several validators moves to `<Feature>RuleBuilderExtensions`.

**Domain.** Defence in depth. Its messages are the fallback; the validator's are what the user
normally sees.

**Handler.** Pre-checks read through the normal query filters, `AsNoTracking`. A conflict a form can
show under an input is keyed by the property: `Error.Conflict(code, message, field: "<Property>",
meta)`, with `meta` carrying machine context such as the existing record's id and name. One conflict
per answer, in a fixed order. Cheap rejections run before work with side effects (consuming a
sequence, calling out).

**Unit of work.** A failed save is logged at `Warning` with its kind and constraint, and answered as
`Error.Conflict("<Entity>.SaveFailed", "Não foi possível salvar … Tente novamente.")` — no field, no
claim about which rule broke. Application never knows a constraint or index name; the retry goes
through the pre-checks and gets the specific answer
([0048](../../docs/adr/0048-database-failures-are-generic-to-the-user.md)).

**Exceptions** remain for: missing configuration at startup, programmer-error guards (`.Value` of a
failed result, `AssignTenant(Guid.Empty)`, a save with no tenant), an unrecognised database error,
and transactional cleanup. A `try/catch` in a handler is a finding.

**What dies in gate 1** — malformed JSON, a non-nullable member absent from the body, a value of the
wrong JSON type, an unknown JSON enum — reaches the client without a pt-BR message or a `code`. That
is why enums travel as strings (§6). Consumers handle the rest as described in
[`docs/API.md`](../../docs/API.md) §4.3.

**Codes and messages.** `code` is English (`<Type>.<Rule>`, `<Entity>.<Reason>`) and is the contract
clients branch on. Messages are pt-BR copy written for the end user; the frontend shows them as they
come and never branches on them. The wire shapes of every error: [`docs/API.md`](../../docs/API.md).

## 5. Tenancy and persistence

**Tenant.** From the validated token, only. `TenantHeaderFilter` refuses, before any action runs, a
request whose `X-Tenant-Id` differs from the token's claim; every action is tenant-scoped unless marked
`[IgnoreTenant]`, which has to justify itself in the PR. No command, query, DTO, mapping or repository
signature carries a tenant: the save interceptor assigns it to every new `ITenantOwned` entity in the
graph and throws when there is none
([0006](../../docs/adr/0006-tenant-header-base-entity-generic-repository.md),
[0008](../../docs/adr/0008-automatic-tenant-assignment-on-save.md),
[0009](../../docs/adr/0009-tenant-owned-entity-base-class.md)). Review checklist and the
model-cache trap of the query filter: skill
[`agenza-tenant-isolation`](../../.claude/skills/agenza-tenant-isolation/SKILL.md).

**Query filters.** `ApplyAuditableConventions`, called once from `OnModelCreating`, gives every
`BaseEntity` a `SoftDelete` filter and every tenant-owned one a `Tenant` filter, plus their indexes
([0046](../../docs/adr/0046-separate-soft-delete-and-tenant-query-filters.md)). No repository ignores
either; `IgnoreQueryFilters()` belongs to a persistence test that asserts a soft delete.

**Entity configuration** — one `IEntityTypeConfiguration<T>` per entity:

- A tenant-owned principal exposes `HasAlternateKey(e => new { e.TenantId, e.Id })`; a relationship
  between tenant-owned entities is the composite FK `(TenantId, <Parent>Id) → (TenantId, Id)`. An
  `Id`-only FK between two tenant-owned entities is a finding.
- Value objects: `HasConversion(v => v.Value, s => <Vo>.Restore(s))`, lengths from the value
  object's constants, never literals. No EF complex types — the InMemory persistence tests do not
  support them.
- Enums: text, with a `CHECK` built from `Enum.GetNames<T>()`.
- Uniqueness: a unique index that includes `TenantId` and filters `"DeletedAt" IS NULL`, plus any
  predicate of the rule itself. The index is the authority; the handler's pre-check only exists to
  give the per-field answer. Case-insensitive uniqueness follows what is displayed: when the
  normalized value is what the interface shows (an e-mail in lowercase, CPF digits), the column stores
  it; when the display keeps the user's form (a name with its casing), the index uses a generated
  normalized column ([0049](../../docs/adr/0049-conventions-for-new-backend-slices.md)).
- Children: `HasMany(…).WithOne()` with the composite foreign and principal keys, navigation through
  the backing field. A child's key, minted by its root, is `ValueGeneratedNever()`: for a key EF thinks
  the store generates, a child added to a loaded root is tracked as `Modified` and its save fails
  ([0053](../../docs/adr/0053-clients-edit-synchronizes-contacts-by-id.md)).
- Soft-delete and tenant filters and their indexes come from the convention — never by hand.

**Repositories.** One per aggregate root — never one for a child. The port `I<Entity>Repository` lives
in `Application/Abstractions` and declares only what a handler calls; the adapter extends
`RepositoryBase<T>` in Infrastructure. It returns its own root (with its children), a list or a page
of them, a `bool` or a count — never a DTO, an `IQueryable` or another aggregate. Methods say what they
are for (`FindActiveByEmailAsync`), take value objects for value-object columns, and use
`AsNoTracking` on pre-check lookups (`Find…Async`), whose result is never changed; `GetByIdAsync` stays
tracked even when a query reuses it. Paged reads go through `ListPagedAsync`. The tenant
and soft-delete filters come from the `DbContext`: a repository never writes a `TenantId` or
`DeletedAt` predicate. A query cannot reach `.Value` through a converter: compare whole value objects,
order by the property, or use `EF.Property<string>(e, "<Property>")` for text matching. Repositories
only stage (`Add`, `Remove`); the handler commits through `IUnitOfWork`, whose shape follows the
service's real transactional need ([0005](../../docs/adr/0005-cqrs-vertical-slice-result-pattern.md)).

**Migrations.** One additive migration per change, named after it (`Add<Thing>`), generated with the
repository's pinned `dotnet ef` (`dotnet tool restore`). Run from the Api folder, so the design-time
factory reads `appsettings.Development.json`; neither command connects to a database:

```bash
cd backend/services/<service>/<Service>.Api
dotnet ef migrations add <Name> --project ../<Service>.Infrastructure
dotnet ef migrations has-pending-model-changes --project ../<Service>.Infrastructure
```

Never edit a committed migration
([0028](../../docs/adr/0028-reset-ef-migrations-before-first-deployment.md)). A migration that drops
or rewrites data is reviewed on its own.

## 6. HTTP surface

One controller per feature: inherits `AgenzaControllerBase`, `[ApiVersion("1.0")]`,
`[Route("api/v{version:apiVersion}/<feature>")]` (`internal/v…` for machine-to-machine routes),
injects `IDispatcher`, holds no logic — bind, dispatch, `result.ToActionResult(this, …)`.

- Bind the command or query type itself; no separate body record. A route id is merged with
  `command with { <Entity>Id = id }`; queries bind `[FromQuery]`.
- Create answers `Created("/api/v1/<feature>/{id}", response)`; update `Ok`; delete `NoContent`;
  reads `Ok`.
- Declare every outcome with `[ProducesResponseType<ApiResponse<T>>]` and
  `[ProducesResponseType<ApiProblemDetails>]` — the frontend's typed client is generated from them.
- The success envelope and the problem shapes come from the shared kernel; never build them by hand.
- A body with a list is bounded twice: the validator caps the count and the action has a
  `[RequestSizeLimit]`.
- Enums travel as camelCase strings, translated in Application (`<Concept>Names`), never as JSON
  enums.
- The wire is camelCase English; calendar dates are `DateOnly` (`yyyy-MM-dd`); instants are UTC.
- A paged list takes `Page`/`PageSize` with defaults and a validator bounding them, and returns
  `PagedResult<T>`; an unpaged list returns `IReadOnlyList<T>`.

A change to an endpoint's contract regenerates the frontend's types in the same change — skill
[`agenza-api-contract`](../../.claude/skills/agenza-api-contract/SKILL.md). A change to a shape that
every endpoint shares (envelope, problem, status mapping) updates [`docs/API.md`](../../docs/API.md);
a feature's own codes and fields do not go there.

## 7. Time

UTC only ([0045](../../docs/adr/0045-backend-works-in-utc.md)). Inject `TimeProvider`. Instants are
`DateTimeOffset` from `GetUtcNow()`; "today" is
`DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime)`, computed in the handler or validator
and handed to the domain. No `DateTime.Now`, `DateTime.Today` or `TimeZoneInfo`. A rule that needs
the business's local day is a new ADR.

## 8. Code style

Methods get a block body. Branching is written as guard clauses with early `return`s and explicit
`if`s, not as `&&`/`||` chains or ternaries folded into an expression body. `=>` stays for a short
local function or property whose body is a single plain expression with no branching, and for the
lambdas an API takes (FluentValidation `.Must(…)`, LINQ). The reference is the handler named in §10.
Older code is converted when touched, not in bulk.

No "what" comments and no XML doc comments; a one-line "why" only for a genuine race or a non-obvious
constraint (root [`AGENTS.md`](../../AGENTS.md)). Rationale belongs in an ADR.

### Logging

Inject `ILogger<T>` and write a message template with named placeholders, never an interpolated string. Serilog is
the pipeline behind it, owned by `Admin.Logging` and brought in by `AddServiceDefaults()`
([0054](../../docs/adr/0054-serilog-readable-console-logging.md)): a service configures nothing. Domain and Application
stay on `Microsoft.Extensions.Logging.Abstractions` and nothing calls the static `Log`. The default levels live in
`Admin.Logging`; a host that needs another level sets it under `Serilog:MinimumLevel` in its `appsettings.json`, and drops a
noisy message by text with `Serilog:Filter` (identity-service does, for OpenIddict's request dumps)
(`Logging:LogLevel` is ignored). A message carries constraint names, codes and ids, not request input; when it must,
strip control characters first (CWE-117), as `GenericExceptionHandler` and the request line do.

## 9. Tests

| Tier | Project | Proves | Tools |
| --- | --- | --- | --- |
| Unit | `<Service>.Tests` | Domain: every rule and normalization of entities and value objects. Application: each handler branch, with repository calls asserted (`Received`, `DidNotReceive`) and nothing persisted on a rejection; each validator rule's code; that the wire JSON binds to the command and a `tenantId` in the body is ignored | xUnit, AwesomeAssertions, NSubstitute, a fixed `TimeProvider` |
| Persistence | `<Service>.PersistenceTests` | EF behaviour with security weight: tenant assignment across the aggregate graph, both filters, value-object conversions, index definitions | EF InMemory, no Docker |
| Contract smoke | the API-contract job in `frontend-ci.yml` | migrations apply to a fresh PostgreSQL, the real OIDC boundary, generated types without drift | Aspire AppHost |

Line coverage of Domain + Application has a gate in `Directory.Build.props`; local `dotnet test`
enforces exactly what CI enforces ([`docs/QUALITY.md`](../../docs/QUALITY.md)). Warnings are errors.

There is no Testcontainers or in-process HTTP test project
([0026](../../docs/adr/0026-remove-dedicated-runtime-tests.md)). What only PostgreSQL can prove — a
filtered unique index under concurrent writes, a composite FK, a `CHECK` — is verified by hand
against a **disposable** PostgreSQL initialised from `infra/postgres/init/`, never against the
`agenza-postgres-data` volume that Aspire keeps for development, and the PR says what was run.

## 10. Reference code and the older generation

Two generations of slices coexist. **Copy the rules of this document, not the nearest file.** Where
the code disagrees with this document, that code is the older generation: convert it when a change
touches that slice, not in bulk.

| Concern | Copy from | Older shape — don't copy | Rule |
| --- | --- | --- | --- |
| Handler: pre-checks, field conflicts with `meta`, generic save failure | `ServicesService.Application/Clients/CreateClient/CreateClientCommandHandler.cs` | `*PersistenceErrorMapper.cs` mapping constraint names to messages | §4, [0048](../../docs/adr/0048-database-failures-are-generic-to-the-user.md) |
| Orchestration owned by the handler | `CreateClientCommandHandler.cs` | `ServiceRelationshipLoader`, a class shared by two handlers | §2, [0049](../../docs/adr/0049-conventions-for-new-backend-slices.md) |
| Validator codes and messages | `CreateClientCommandValidator.cs`, `ClientRuleBuilderExtensions.cs` | rules without `.WithErrorCode`, which leak `NotEmptyValidator`/`PredicateValidator` to the API | §4, [0044](../../docs/adr/0044-clients-aggregate-uniqueness-and-conflict-contract.md) |
| Domain errors | `static readonly DomainError` per rule on `Client` and on the value objects | one inline `new DomainError("<Entity>.Invalid", …)` shared by every rule of an entity | §3 |
| Value objects | `ServicesService.Domain/ValueObjects/` with `Create`/`Restore` | money and a percentage as primitives validated inside the entity (`Service`) | §3, [0049](../../docs/adr/0049-conventions-for-new-backend-slices.md) |
| Aggregate with children; references to other aggregates | `Client`, `ClientConfiguration` | a navigation to another root filled by an unchecked `SetTags` (`Service.Tags`) | §3, [0049](../../docs/adr/0049-conventions-for-new-backend-slices.md) |
| Update, with children synchronized by id | `UpdateClientCommandHandler.cs`, `Client.Update`: load → `NotFound` → `ApplyTo` → pre-checks that exclude the aggregate itself → save | | §3, §4, [0053](../../docs/adr/0053-clients-edit-synchronizes-contacts-by-id.md) |
| Read, delete, list, paging | the earlier slices are the only examples; their flow is current (load → `NotFound` → pre-checks → save; paged query + bounded validator + `PagedResult`) minus the rows above | | §4, §6 |
| Code style | `CreateClientCommandHandler.cs` | expression-bodied methods with `&&`/ternaries, "what" comments | §8 |

This table is the only place that names reference files. When a newer slice supersedes one, change
the row in the same PR. A conversion is scoped to what the change touches: a fix to a service's
description does not rewrite its tag relationship.

## 11. What enforces what

| Rule | Enforced by |
| --- | --- |
| Layer direction | project references — compile error |
| No warnings | `TreatWarningsAsErrors` |
| Domain + Application coverage | coverlet threshold, `Directory.Build.props` |
| Tenant on every action, every write, every read | `TenantHeaderFilter`, save interceptor, query filters; `PersistenceTests` |
| Contract with the frontend | `generate:api-types:check` in CI |
| Migrations apply from an empty database | the API-contract job |
| Everything else here — composite keys, additive migrations, the five gates, codes, style | **review** |

ADRs 0024, 0026 and 0028 list an "architecture guard" among their fitness functions. That script was
removed with the agent-governance framework (`bfd16b8`,
[ADR 0016](../../docs/adr/0016-ai-agent-governance-framework.md)) and nothing replaced it. Don't
count on a check to catch what review misses.

## 12. Deliberately absent

Re-proposing any of these needs a new ADR that says what changed.

| Not here | Why | Decided in |
| --- | --- | --- |
| MediatR, FluentAssertions | commercial licences; the dispatcher is a hundred lines | [0005](../../docs/adr/0005-cqrs-vertical-slice-result-pattern.md) |
| A base handler, generic CRUD, loader/manager/service classes between handlers | each use case reads alone; the repository is the shared seam | [0049](../../docs/adr/0049-conventions-for-new-backend-slices.md) |
| `<X>Factory` and builder classes, public constructors, mapping libraries | static `Create`/`Restore` and `From<Entity>` are explicit | [0049](../../docs/adr/0049-conventions-for-new-backend-slices.md) |
| Navigations between aggregates | couples two consistency boundaries to save a query | [0049](../../docs/adr/0049-conventions-for-new-backend-slices.md) |
| Caching, projections in repositories, raw SQL, gap-free sequences — without evidence | the simplest correct form first | [0049](../../docs/adr/0049-conventions-for-new-backend-slices.md) |
| Exceptions for business outcomes, a `BusinessException` hierarchy | Result end to end | [0014](../../docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md) |
| Monadic `Bind`/`Map` helpers over results | explicit sequential checks | [0014](../../docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md) |
| Validators that query repositories | duplicated queries and wrong status codes | [0010](../../docs/adr/0010-cross-aggregate-checks-in-validators.md) → [0012](../../docs/adr/0012-revert-cross-aggregate-checks-to-handlers-and-domain.md) |
| Conflict messages per constraint | Application would know index names | [0048](../../docs/adr/0048-database-failures-are-generic-to-the-user.md) |
| Several conflicts merged in one answer (`Error.Combine`) | a kernel-wide helper for one call site | [0044](../../docs/adr/0044-clients-aggregate-uniqueness-and-conflict-contract.md) |
| A `Deleted` status; JSON enums; EF complex types | see §3, §6, §5 | [0044](../../docs/adr/0044-clients-aggregate-uniqueness-and-conflict-contract.md) |
| `IgnoreQueryFilters()` in a repository | tenant scope would depend on remembering a predicate | [0046](../../docs/adr/0046-separate-soft-delete-and-tenant-query-filters.md) |
| Time zones | UTC only | [0045](../../docs/adr/0045-backend-works-in-utc.md) |
| Testcontainers, `WebApplicationFactory` | maintenance cost; manual verification instead | [0015](../../docs/adr/0015-remove-integration-tests-unit-tests-only-in-ci.md), [0026](../../docs/adr/0026-remove-dedicated-runtime-tests.md) |
| Roles and permissions | every user of a tenant sees everything; tenant isolation is the whole authorization story | skill `agenza-tenant-isolation` |
