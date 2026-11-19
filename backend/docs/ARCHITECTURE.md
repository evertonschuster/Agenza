# Backend — Architecture

Current backend conventions; read the section the task affects. §10 points to examples, §11 states
what enforces what. The why and what was rejected: [backend.md](../../docs/decisions/backend.md)
(use cases, domain, API, dates), [platform.md](../../docs/decisions/platform.md) (topology, tenancy,
auth, database, logging) and [process.md](../../docs/decisions/process.md) (tests and CI).

Rules of thumb:

- **Abstraction proportional to the problem.** Lean plumbing (one hand-rolled dispatcher, explicit
  mapping, explicit `if (x.IsFailure) return …`); invested domain (aggregates, value objects, named
  errors).
- **One source of truth per rule.** The domain's constants and codes feed the validator and the EF
  configuration; the database index decides uniqueness; the token claim is the only tenant.
- **The simplest correct form first.** A command loads the aggregate, changes it through behaviour
  and saves; a query loads and maps. Caching, projections in repositories, raw SQL, hand-opened
  transactions, gap-free sequences, denormalized columns and parallel queries need a measured
  problem or a product rule, stated in the PR. No query per row, untracked reads and explicitly
  tracked updates are shape, not optimization, and stay required.

Placeholders: `<Service>` = project prefix (`ServicesService`), `<Feature>` = plural folder
(`Clients`), `<Operation>` = verb + noun (`CreateClient`), `<Entity>` = the aggregate (`Client`).

## 1. Shape

### Services

One service per business context. A capability that fits an existing context is a new `<Feature>/`
folder there; splitting a context out is a recorded decision. Each service owns its schema,
migrations history, database role and API; services talk over HTTP with tokens, never through each
other's tables. Cross-cutting behavior sits behind one entry point (`AddServiceDefaults`: logging,
telemetry, health), so a new service has nothing to remember to wire.

`services-service` is the template for a tenant-owned context. `identity-service` is the OIDC
provider (ASP.NET Identity, no tenant-owned entities, a unit of work over two stores); don't carry
its specifics into a business service. A new service copies the project set below and its
`Domain/Common/` types, adds a schema and role in `infra/postgres/init/`, a schema-scoped migrations
history table and an AppHost resource, and registers `TenantHeaderFilter` if it serves tenant-owned
resources.

### Projects and dependency direction

```
<Service>.Domain            → Admin.SharedKernel.ValueObjects only; no package
<Service>.Application       → Domain, Admin.SharedKernel
<Service>.Infrastructure    → Application, Admin.SharedKernel.EntityFrameworkCore, Admin.Identity.Client
<Service>.Api               → Application, Infrastructure, Admin.SharedKernel.AspNetCore, ServiceDefaults
<Service>.Tests             → Domain, Application
<Service>.PersistenceTests  → Infrastructure; EF InMemory, only where EF model behaviour needs proof
```

Nothing checks this direction (§11): review changed project and package references as architecture.

| Shared project (infrastructure only, never business rules) | Referenced by                                |
| ---------------------------------------------------------- | -------------------------------------------- |
| `Admin.SharedKernel`                                       | Application                                  |
| `Admin.SharedKernel.AspNetCore`                            | Api                                          |
| `Admin.SharedKernel.EntityFrameworkCore`                   | Infrastructure                               |
| `Admin.SharedKernel.ValueObjects`                          | Domain; it references nothing                |
| `Admin.Identity.Client`                                    | Infrastructure, Api                          |
| `Admin.Logging`                                            | `ServiceDefaults`, `AppHost` — never a layer |

`BaseEntity`, `TenantOwnedEntity`, `DomainResult` and `DomainError` are duplicated per service on
purpose, because Domain may reference only the value-objects project. A shared change affects every
consumer; reuse needs a real second caller, not an anticipated one.

## 2. Anatomy of a feature

Vertical slices organise the Application layer; they do not replace the layers.

```
<Service>.Domain/
  Common/
  Entities/                                aggregate roots, their children, their enums
  ValueObjects/
<Service>.Application/
  Abstractions/                            ports
  <Feature>/
    <Entity>Response.cs                    wire DTO with a static From<Entity>(…), shared by the operations
    <Operation>/
      <Operation>Command.cs | Query.cs     a record; nested input records live in the same file
      <Operation>CommandHandler.cs | QueryHandler.cs
      <Operation>CommandValidator.cs | QueryValidator.cs      whenever the request carries input
      <Operation>CommandExtensions.cs      ToModel(…) / ApplyTo(entity) / To<Entity>Data(): command → domain input
<Service>.Infrastructure/
  Persistence/Configurations/<Entity>Configuration.cs
  Persistence/Migrations/
  Repositories/<Entity>Repository.cs
  DependencyInjection.cs
<Service>.Api/Controllers/<Feature>Controller.cs
<Service>.Tests/<Feature>/                 tests of the feature's entities and value objects
<Service>.Tests/<Feature>/<Operation>/     handler, validator and binding tests
```

- Handlers and validators are registered by assembly scan; never by hand, never through a mediator
  library. Repositories and adapters are registered in Infrastructure's `DependencyInjection.cs`.
- A type is born in its operation folder and moves to the feature root when a second operation needs
  it — not before.
- `ToModel`/`ApplyTo` are extension methods on the command, so the handler reads as orchestration.
  They only call the domain's public factories and behaviour and add no rule. A root with many
  members takes an `<Entity>Data` record (`ClientData`): the extension builds it and the handler
  calls `Create`/`Update`.

**A use case owns its orchestration.** One handler per operation; no base handler and no class
between handlers that orchestrates — no loader, manager, service or helper. What two handlers share
goes to the domain (a rule), a repository method (a read) or `<Entity>Response.From<Entity>` (a
mapping). A few orchestration lines, or an input rule, repeated between create and edit are
accepted.

**Inputs and outputs are explicit records.** Inputs are the command or query and its nested
`<Thing>Input` records: primitives, strings, `DateOnly`, ids, shared string value objects and enums
— no other domain type, no tenant. The output is `<Entity>Response.From<Entity>(entity, …)`, built
from the aggregate plus what the handler read for it; another aggregate appears as a small
`<Entity>Summary`. A value object flattens to its primitive; an enum stays an enum (the kernel
writes it as a camelCase string), so the mapping never calls `ToString()` on it. No mapping library,
no DTO in the domain, no entity past the handler.

## 3. Domain

**Aggregate roots** inherit `TenantOwnedEntity` or `BaseEntity`, with a private constructor (plus a
private parameterless one for EF) and private setters. `public static DomainResult<T> Create(…)`
validates and builds; behaviour methods return `DomainResult` and validate every new value before
assigning any, so a failure never leaves a half-updated entity.

**Aggregates reference each other by id**, never a navigation, and load only their own children. A
many-to-many is a child of the owning root holding the other's id, keyed
`(TenantId, OwnerId, OtherId)` with composite foreign keys to both.

**Behaviour has intention.** A state transition, or a change to a part with its own rule, is a named
method (`Inactivate()`, `ReplaceContacts(…)`) that refuses an invalid transition with a named error.
A whole-record `Update(…)` is fine for free data with no transition. A method that sets state
without checking anything (`SetX`) does not exist.

**Factories are static methods on the type**: `Create` on roots and value objects,
`internal static Create` on children, `Restore` on value objects. No `<X>Factory` or builder
classes, no public constructors.

**Children** are created only by their root, through an `internal` factory that receives the root's
id and plain data records. They are exposed as `IReadOnlyCollection<T>` over a private list, have no
`DbSet` and are read and written through the root; nothing outside the domain creates a child or
moves it to another root.

**Value objects** are `sealed record`s with a private constructor and:

- `static DomainResult<T> Create(raw)`, which validates **and normalizes** input (trim, case, mask);
  an optional value returns `Success(null)` for blank input;
- `static T Restore(stored)`, which rebuilds without validating, so a row stays readable after a
  rule changes; EF conversions call it;
- limits as constants, errors as `public static readonly DomainError`, and pure predicates
  (`IsValid`, `HasValidShape`) when a validator needs the check without building the value.

A value is a value object when it has a format or normalization (CPF, e-mail, phone), a rule over
several values, a closed set that carries a rule, a rule that needs a parameter (a birth date and
today), when it is money or a percentage, or when more than one type uses its rule. Free text
bounded only by length **may** stay a primitive, validated by its owner with a named `DomainError`.
The column stores the normalized value. A set of independent options with no rule beyond membership
is a plain enum held as `IReadOnlySet<TEnum>`: the entity keeps its own copy and refuses an empty
set and a non-member with named errors, in `Create` and in every behaviour that replaces the set.

**Shared value objects** live in `Admin.SharedKernel.ValueObjects` when the value has a format and
no business context (CPF, full name, phone, e-mail, birth date, administrative notes). They behave
as scalars on the wire; adding one follows the backend-slice skill's
[value objects](../../.claude/skills/agenza-backend-slice/references/value-objects.md).

- A `sealed record` implementing `IStringValueObject<T>`; `Create(raw)` returns `ParseResult<T>`
  (the value or the pt-BR message of the failed rule) — no `DomainResult`, no `DomainError`, no
  `Parse`.
- A blank string is not a value (`Create("")` fails); an optional member is nullable.
  `BlankIsAbsent` (default `true`) binds a blank to `null`; a type that sets it `false` (`FullName`)
  answers its own message.
- The kernel registers the JSON converter, the OpenAPI `string` schema and the column conversion:
  only `HasMaxLength` is written in the entity configuration, and a command member
  (`CpfNumber? Cpf`) needs no validator rule and no call in `ToModel`.
- It is read from a query or route only when it declares
  `[TypeConverter(typeof(StringValueObjectTypeConverter<T>))]` (`SearchText` does); personal data
  never does, because a URL ends up in logs.
- A date whose rules depend on the day (`BirthDate`) implements `IDateValueObject<T>` —
  `Create(date, today)`, with `today` from the container's `TimeProvider`. Anything else stays in
  the service, with `Create`.

**Errors.** `DomainError(Code, Message)`, declared once per rule as `static readonly` on the owning
type. The code is `<Type>.<Rule>` and describes the value, not its user (`Client.GuardianRequired`),
so it can be reused. Messages are pt-BR.

**Lifecycle.** "Deleted" is `BaseEntity`'s soft delete and nothing else: the repository `Remove`s,
the interceptor stamps `DeletedAt`, the filter hides the row, a deleted id answers 404. Never add a
`Deleted` status beside it. Other states are an enum, stored as text.

**The domain does not know** the tenant (assigned on save, §5), the wire (§6), the clock (`today` is
a parameter, §7), persistence or other aggregates; a rule that needs another aggregate or the
database's current state belongs to the handler (§4). Ids are `Guid.CreateVersion7()`, minted by the
caller (`ToModel`) or, for a root built from `<Entity>Data` and for children, by their own factory.

## 4. Errors — one pipeline, five gates

Expected outcomes are values; only the unexpected throws.

| #   | Gate                                   | Owns                                                                 | Answers                                                                                                                                                             |
| --- | -------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Model binding and shared value objects | JSON syntax and types; the format of a shared value object           | 400 `Validation.Failed`, under the field or under the empty key for an empty path, `$` or a syntax error; English framework message or the value object's pt-BR one |
| 2   | Validator, run by the dispatcher       | input shape: required, length, format, range, list size, cross-field | 400 `Validation.Failed`, `errors` keyed by camelCase property path                                                                                                  |
| 3   | Domain → `DomainResult`                | the same invariants again, plus rules over the whole aggregate       | 400 via `DomainErrorMapper`: the domain's code at the top, its message under the empty key                                                                          |
| 4   | Handler                                | current state: existence, uniqueness, in use, other aggregates       | `NotFound` 404, `Conflict` 409                                                                                                                                      |
| 5   | Unit of work, `PersistenceResult`      | recognized persistence failures                                      | 409 `<Entity>.SaveFailed`, generic; unrecognized failures propagate                                                                                                 |
| —   | Anything else                          | —                                                                    | exception → `GenericExceptionHandler` → generic 500                                                                                                                 |

**Validator.** Synchronous; no repository, no I/O. Each rule carries the domain's code
(`.WithErrorCode(<DomainError>.Code)`) and its own pt-BR message naming the field, with limits from
the domain's constants, so a rule answers the same code whichever gate catches it. A rule two
validators share is written in both: there is no `<Feature>RuleBuilderExtensions`; the constants
keep the copies aligned and each validator's tests assert the code. In a body, a string with several
enum names still converts, so the validator refuses it with `IsInEnum`.

**Domain.** Defence in depth; its messages are the fallback, the validator's are what users see.

**Handler.** Pre-checks read through the normal query filters, `AsNoTracking`. A conflict a form can
show under an input is keyed by the property:
`Error.Conflict(code, message, field: "<Property>", meta)`, with `meta` carrying machine context
such as the existing record's id and name. One conflict per answer, in a fixed order; cheap
rejections run before side effects.

**Unit of work.** It recognizes expected database failures and logs them at `Warning` with kind and
constraint; the handler only answers
`Error.Conflict("<Entity>.SaveFailed", "Não foi possível salvar … Tente novamente.")` — no field, no
claim about which rule broke, no logger. Application never knows a constraint name; the retry goes
through the pre-checks and gets the specific answer.

**Exceptions** remain for missing configuration at startup, programmer-error guards (`.Value` of a
failed result, `AssignTenant(Guid.Empty)`, a save with no tenant), an unrecognised database error
and transactional cleanup. Trace a handler's `try/catch` to its responsibility: expected business
failures remain results, and persistence translation belongs in the unit of work.

**Codes and messages.** `code` is English (`<Type>.<Rule>`, `<Entity>.<Reason>`) and is what clients
branch on; messages are pt-BR copy shown as they come, never branched on. Wire shapes, including
what dies in gate 1: [`docs/API.md`](../../docs/API.md) §4.3.

## 5. Tenancy and persistence

**Tenant.** From the validated token, only. A tenant-owned service registers
[TenantHeaderFilter](../shared/Admin.Identity.Client/TenantHeaderFilter.cs), which refuses a missing
or malformed header, a missing claim or a mismatch. `[IgnoreTenant]` skips that comparison, needs an
explicit authorization rationale and is not anonymous access. Commands, queries, DTOs, mappings and
business repository methods do not accept a client-selected tenant. Do not assume a fine-grained
panel permission model: M2M scopes and tenant/token checks have their own boundaries; inspect the
endpoint's actual policy.

The
[save interceptor](../services/services-service/ServicesService.Infrastructure/Persistence/Interceptors/AuditableEntitySaveChangesInterceptor.cs)
fills an empty tenant on `Added` entities and throws without a current tenant; it does not replace a
preassigned tenant nor check ownership of every modified row, so it is no permission to attach a
client-selected graph. It stamps `CreatedBy`/`UpdatedBy`/`DeletedBy` from `sub`; `tenant_id` is the
tenant claim. Review checklist: skill
[`agenza-tenant-isolation`](../../.claude/skills/agenza-tenant-isolation/SKILL.md).

**Query filters.**
[ApplyAuditableConventions](../shared/Admin.SharedKernel.EntityFrameworkCore/ModelBuilderExtensions.cs)
(from `OnModelCreating`) gives every `BaseEntity` a `SoftDelete` filter and every tenant-owned one a
`Tenant` filter, plus their indexes. No repository ignores either; `IgnoreQueryFilters()` belongs to
a persistence test that asserts a soft delete. The filter references the context's
`CurrentTenantId`, never a tenant Guid constant in the model EF caches (the tenant skill covers the
trap). Composite FKs keep relationships inside a tenant; PostgreSQL roles restrict each service to
its schema but do not isolate tenant rows (§11).

**Entity configuration** — one `IEntityTypeConfiguration<T>` per entity:

- A tenant-owned principal exposes `HasAlternateKey(e => new { e.TenantId, e.Id })`; relationships
  between tenant-owned entities use the composite FK `(TenantId, <Parent>Id) → (TenantId, Id)`. An
  `Id`-only FK between two tenant-owned entities is a finding.
- Value objects: `HasConversion(v => v.Value, s => <Vo>.Restore(s))` for the service's own; shared
  ones come from `AddValueObjectConversions()`. Lengths from the value object's constants, never
  literals. No EF complex types, because the InMemory persistence tests do not support them.
- Enums: text, with a `CHECK` from `Enum.GetNames<T>()`. A set of options in one column is the sum
  of the members' fixed codes, with a range `CHECK` and a set-equality `ValueComparer`; a stored
  value no rule accepts today still reads back.
- Uniqueness: a unique index including `TenantId`, filtered on `"DeletedAt" IS NULL` plus the rule's
  own predicate. The index is the authority; the pre-check only gives the per-field answer.
  Case-insensitive uniqueness follows the display: the column stores the normalized value when that
  is what is shown (lowercase e-mail, CPF digits); otherwise the index uses a generated normalized
  column.
- Children: `HasMany(…).WithOne()` with the composite keys, navigation through the backing field.
  The child's factory mints its key and the configuration is `ValueGeneratedNever()`, because a key
  EF thinks the store generates makes a child added to a loaded root tracked as `Modified`, and its
  save fails.
- Soft-delete and tenant filters and their indexes come from the convention — never by hand.

**Repositories.** One per aggregate root — never one for a child.

- The port `I<Entity>Repository` lives in `Application/Abstractions` and declares only what a
  handler calls; the adapter extends `RepositoryBase<T>`.
- It returns its root with its children, a list or a page of them (each root whole, because
  `UpdateAsync` stages the children the root holds), a `bool` or a count — never a DTO, an
  `IQueryable` or another aggregate.
- Methods say what they are for (`FindActiveByEmailAsync`) and take value objects for value-object
  columns. Reads are untracked: Infrastructure's `DependencyInjection.cs` sets it globally and
  `RepositoryBase` asks for it explicitly.
- A command loads with `GetByIdAsync`, applies behaviour, then stages with `UpdateAsync`; the port
  does not expose EF tracking, and the adapter makes any state change explicitly inside that
  operation.
- Paged reads take a `PageRequest` (or the list's filter record extending it) and return
  `PagedResult<T>` through `ListPagedAsync`, whose filter-and-order function returns an
  `IOrderedQueryable<T>`.
- A repository never writes a `TenantId` or `DeletedAt` predicate; the `DbContext` filters do.
- A query cannot reach `.Value` through a converter: compare whole value objects or order by the
  property. Text match or sort on a value-object column (`EF.Property<string>` over it throws) goes
  through a stored generated `string` column (`lower("FullName")`) added by an additive migration.
- Repositories only stage (`Add`, `UpdateAsync`, `Remove`); the handler commits through
  `IUnitOfWork`, shaped by the service's real transactional need.

**Migrations.** One additive migration per change, named after it (`Add<Thing>`), with the pinned
`dotnet ef` (`dotnet tool restore`), run from the Api folder so the design-time factory reads
`appsettings.Development.json`; neither command connects to a database:

```bash
cd backend/services/<service>/<Service>.Api
dotnet ef migrations add <Name> --project ../<Service>.Infrastructure
dotnet ef migrations has-pending-model-changes --project ../<Service>.Infrastructure
```

Never edit a committed migration. A migration that drops or rewrites data is reviewed on its own.

## 6. HTTP surface

One controller per feature: `AgenzaControllerBase`, `[ApiVersion("1.0")]`,
`[Route("api/v{version:apiVersion}/<feature>")]` (`internal/v…` for machine-to-machine),
`IDispatcher` injected, no logic — bind, dispatch, `result.ToActionResult(this, …)`.

- Bind the command or query itself; no separate body record. Merge a route id with
  `command with { <Entity>Id = id }`; queries bind `[FromQuery]`.
- Create answers `Created("/api/v1/<feature>/{id}", response)`; update and reads `Ok`; delete
  `NoContent`.
- Declare every outcome with `[ProducesResponseType<ApiResponse<T>>]` and
  `[ProducesResponseType<ApiProblemDetails>]`; the frontend's typed client is generated from them.
- The envelope and problem shapes come from the shared kernel; never build them by hand.
- A body with a list is bounded twice: the validator caps the count and the action has a
  `[RequestSizeLimit]`.
- Enums travel as camelCase names, set by `AddWireFormat()` for every enum, integers refused (query
  and route binding: [`docs/API.md`](../../docs/API.md) §4.3). Nothing to register per enum, no
  translation class, no values chosen to dodge the parser. Each item of a list of enums in a body
  has an `IsInEnum` rule with the domain's code.
- The wire is camelCase English; calendar dates are `DateOnly` (`yyyy-MM-dd`), and a date value
  object also reads an instant, keeping its day as written; instants are UTC.
- A paged list's query extends `PagedQuery` (`Page`, `PageSize`, `PageRequest` defaults, unguarded);
  its validator writes the three `Paging.*` rules (page ≥ 1, size 1..`PageRequest.MaxPageSize`,
  offset within `PageRequest.OffsetFits`). The query's own `ToFilter()` builds the list's filter
  (`ClientListFilter`), an Application record, so there is no extension file; the handler `Map`s the
  `PagedResult<T>`. Free-text search is a `SearchText`; an unpaged list returns `IReadOnlyList<T>`.

A contract change regenerates the frontend's types in the same change (skill
[`agenza-api-contract`](../../.claude/skills/agenza-api-contract/SKILL.md)). A change to a shape
every endpoint shares (envelope, problem, status mapping) updates
[`docs/API.md`](../../docs/API.md); a feature's own codes and fields do not.

## 7. Time

UTC only. Inject `TimeProvider`: instants are `DateTimeOffset` from `GetUtcNow()`; "today" is
`DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime)`, computed in the handler or validator
and passed to the domain. No `DateTime.Now`, `DateTime.Today` or `TimeZoneInfo`. A rule that needs
the business's local day is a new decision.

## 8. Code style

Methods get a block body. Branching uses guard clauses with early `return`s and explicit `if`s, not
`&&`/`||` chains or ternaries folded into an expression body. `=>` stays for a short local function
or property whose body is a single plain expression with no branching, and for lambdas an API takes
(`.Must(…)`, LINQ). LINQ chains take one operator per line, with lookups in their own method or
local; an `Error`/`FieldError` construction stays one nested expression. Apply this to new or
necessarily changed logic (§10).

No "what" comments and no XML doc comments; a one-line "why" only for a genuine race or a
non-obvious constraint. Rationale belongs in `docs/decisions/`.

### Logging

Inject `ILogger<T>` and use message templates with named placeholders, never interpolated strings.
Application uses `Microsoft.Extensions.Logging.Abstractions`; no layer calls the static Serilog
`Log`. Default levels live in `Admin.Logging`; a host overrides them under `Serilog:MinimumLevel`
and drops a noisy message with `Serilog:Filter` (`Logging:LogLevel` is ignored). A message carries
constraint names, codes and ids, not request input; when it must, strip control characters first
(CWE-117), as `GenericExceptionHandler` and the request line do.

## 9. Tests

| Tier           | Project                                   | Scope and limits                                                                                                                         | Tools                                                       |
| -------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Unit           | `<Service>.Tests`                         | Rule, handler, validator and binding behavior through the cases asserted; mocks prove neither the database nor the JWT boundary          | xUnit, AwesomeAssertions, NSubstitute, fixed `TimeProvider` |
| Persistence    | `<Service>.PersistenceTests`              | EF tenant assignment, filters, conversions and tag-deletion relationship coverage; metadata assertions do not run PostgreSQL constraints | EF InMemory                                                 |
| Contract smoke | the API-contract job in `frontend-ci.yml` | Fresh migrations, selected OIDC and tenant-isolation requests, both `ClientTags` tenant foreign keys, generated type drift               | Aspire AppHost                                              |

Line coverage (§11, [`docs/DEVELOPMENT.md`](../../docs/DEVELOPMENT.md)) is not evidence that every
rule or branch is tested. Assert rejection paths, including that a rejected command saved nothing;
for input rules assert the code; use a fixed clock when the day matters. The backend test projects
stay free of Testcontainers and in-process HTTP hosting. Verify a changed PostgreSQL property
outside the smoke's scope by hand on a **disposable** database initialised from
`infra/postgres/init/`, never the persistent development volume, and record what ran in the PR.

## 10. Reference code and the older generation

Generations coexist. Compare the relevant example and its callers with §§2–8; a disagreement needs
investigation and does not expand the task into migrating unrelated code.

| Concern                                              | Example                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Handler orchestration, field conflicts, save failure | [CreateClientCommandHandler](../services/services-service/ServicesService.Application/Clients/CreateClient/CreateClientCommandHandler.cs)                                                                                                                                                                        |
| Input validation with stable codes                   | [CreateClientCommandValidator](../services/services-service/ServicesService.Application/Clients/CreateClient/CreateClientCommandValidator.cs), [UpdateClientCommandValidator](../services/services-service/ServicesService.Application/Clients/UpdateClient/UpdateClientCommandValidator.cs)                     |
| Aggregate invariants, children, named errors         | [Client](../services/services-service/ServicesService.Domain/Entities/Client.cs), [ClientConfiguration](../services/services-service/ServicesService.Infrastructure/Persistence/Configurations/ClientConfiguration.cs)                                                                                           |
| Many-to-many kept by id, tenant-composite FKs        | [ClientTag](../services/services-service/ServicesService.Domain/Entities/ClientTag.cs), [ClientTagConfiguration](../services/services-service/ServicesService.Infrastructure/Persistence/Configurations/ClientTagConfiguration.cs)                                                                               |
| Shared and context-specific value objects            | [CpfNumber](../shared/Admin.SharedKernel.ValueObjects/CpfNumber.cs), [the service's ValueObjects](../services/services-service/ServicesService.Domain/ValueObjects/)                                                                                                                                             |
| Composition update                                   | [UpdateClientCommandHandler](../services/services-service/ServicesService.Application/Clients/UpdateClient/UpdateClientCommandHandler.cs), [ClientRepository](../services/services-service/ServicesService.Infrastructure/Repositories/ClientRepository.cs)                                                      |
| Read by id and state transitions                     | [GetClientById](../services/services-service/ServicesService.Application/Clients/GetClientById/), [DeactivateClient](../services/services-service/ServicesService.Application/Clients/DeactivateClient/), [ReactivateClient](../services/services-service/ServicesService.Application/Clients/ReactivateClient/) |
| Paging and search                                    | [ListClients](../services/services-service/ServicesService.Application/Clients/ListClients/), [ListTags](../services/services-service/ServicesService.Application/Tags/ListTags/)                                                                                                                                |
| Soft deletion                                        | [DeleteClientCommandHandler](../services/services-service/ServicesService.Application/Clients/DeleteClient/DeleteClientCommandHandler.cs)                                                                                                                                                                        |

Older operations still use persistence-error mappers, a tracked `GetForUpdateAsync` on the port, a
relationship loader shared between handlers, uncoded validator rules or cross-aggregate navigations.
They are not a precedent for new code; convert only what the requested behavior or safety needs.
Update an example when it stops demonstrating its concern.

## 11. What enforces what

| Property                                                    | Current mechanism and limit                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Available dependencies                                      | Current `.csproj` references and compilation; no rule prevents adding a forbidden reference                                                                                |
| Warning-free build                                          | `TreatWarningsAsErrors` in [Directory.Build.props](../Directory.Build.props)                                                                                               |
| Unit line coverage                                          | Coverlet configuration in [Directory.Build.props](../Directory.Build.props) and [Directory.Build.targets](../Directory.Build.targets); not semantic or relational coverage |
| Token/header correspondence                                 | JWT validation and the registered `TenantHeaderFilter`; not proof of ownership for an arbitrary attached graph                                                             |
| Tenant query scope and empty-tenant assignment on insertion | Context filters and interceptor; [PersistenceTests](../services/services-service/ServicesService.PersistenceTests/) exercise their cases with EF InMemory                  |
| Tenant isolation over HTTP                                  | [Browser smoke](../../apps/admin-frontend/e2e/tenant-isolation.spec.ts) exercises GET, PUT and DELETE for another tenant's person                                          |
| Tenant foreign keys on `ClientTags`                         | [SQL smoke](../../scripts/smoke_tenant_foreign_keys.sql) checks that PostgreSQL rejects a cross-tenant link at either end                                                  |
| Other relationships, unique indexes, CHECKs and privileges  | Defined in configuration, migrations and init scripts. PostgreSQL verification follows §9                                                                                  |
| Frontend type contract                                      | `generate:api-types:check` in [frontend CI](../../.github/workflows/frontend-ci.yml); no proof of all HTTP behavior                                                        |
| Fresh migration chain and selected OIDC flow                | The API-contract job and [smoke script](../../scripts/smoke_oidc_contract.py)                                                                                              |
| Remaining conventions                                       | Review of the affected rule and its observable consequence; no general architecture guard                                                                                  |
