# Backend — Architecture

Current backend conventions and their rationale. Read the section affected by the task; the
[ADR index](../../docs/adr/README.md) distinguishes accepted decisions from historical passages.
Code, project files and CI describe the implementation and checks actually present. A disagreement
needs investigation: neither a stale document nor an older slice automatically defines the right
change. Section 10 supplies examples; section 11 states the limits of enforcement.

This guide owns technical conventions. Skills route the work to these sections instead of
maintaining another rulebook. Feature inventories, runtime pins and execution results belong to
code, configuration and PR/CI evidence.

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
  a product rule, stated in the PR. Record architectural decisions through the
  [root workflow](../../AGENTS.md#fluxo-de-trabalho); routine implementation does not create an
  additional documentation step in this guide. Not a query per row, and
  explicit no-tracking reads with explicitly tracked updates, are shape rather than optimization and
  stay required ([0057](../../docs/adr/0057-services-query-tracking-is-explicit.md)).

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
<Service>.Domain            entities, value objects, DomainResult        → Admin.SharedKernel.ValueObjects only; no package
<Service>.Application       use cases, ports in Abstractions/            → Domain, Admin.SharedKernel
<Service>.Infrastructure    EF Core, repositories, adapters              → Application, Admin.SharedKernel.EntityFrameworkCore, Admin.Identity.Client
<Service>.Api               controllers, Program.cs, Setup/              → Application, Infrastructure, Admin.SharedKernel.AspNetCore, ServiceDefaults
<Service>.Tests             unit tests                                   → Domain, Application
<Service>.PersistenceTests  EF InMemory, only where tenant EF behaviour needs proof → Infrastructure
```

The current `.csproj` references constrain which dependencies each layer can use. Compilation
catches an unavailable dependency, but does not forbid adding a new reference that violates this
direction. Review changed project/package references as architecture; there is no dedicated
dependency-policy check in the current repository (§11).

Shared projects in `backend/shared/` hold infrastructure, never business rules:

| Project                                  | Holds                                                                                                                                                                                 | Referenced by                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `Admin.SharedKernel`                     | `Result`, `Error`/`ErrorType`/`FieldError`, CQRS contracts, `IDispatcher`, `PagedQuery`, `PageRequest` and `PagedResult`, the JSON converters of the wire (value objects, enum names) | Application                                  |
| `Admin.SharedKernel.AspNetCore`          | `ToActionResult`, `ApiResponse<T>`, `ApiProblemDetails`, `AgenzaControllerBase`, `GenericExceptionHandler`, `AddWireFormat()`                                                         | Api                                          |
| `Admin.SharedKernel.EntityFrameworkCore` | `RepositoryBase<T>` (with the paged read over `PageRequest`), `ApplyAuditableConventions` (soft-delete and tenant filters), the column conversion of the shared value objects         | Infrastructure                               |
| `Admin.SharedKernel.ValueObjects`        | `IStringValueObject<T>` and the string value objects every service shares (`CpfNumber`); no reference at all                                                                          | Domain                                       |
| `Admin.Identity.Client`                  | JWT validation, `ITenantAccessor`, `ICurrentUserAccessor`, `TenantHeaderFilter`, `[IgnoreTenant]`                                                                                     | Infrastructure, Api                          |
| `Admin.Logging`                          | the Serilog pipeline: console format, default levels, OTLP export, one line per request                                                                                               | `ServiceDefaults`, `AppHost` — never a layer |

`BaseEntity`, `TenantOwnedEntity`, `DomainResult` and `DomainError` are **duplicated per service on
purpose** — Domain references only a project that holds value objects and nothing else, so it cannot
share them
([0006](../../docs/adr/0006-tenant-header-base-entity-generic-repository.md),
[0014](../../docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md)). That project,
`Admin.SharedKernel.ValueObjects`, is the one shared project that holds domain types: a format that is
the same in every service, never a rule of one context
([0055](../../docs/adr/0055-shared-string-value-objects.md)).

A shared change affects the services consuming that project. Reuse needs a real second caller,
not an anticipated one; inspect project references before treating it as repo-wide infrastructure.

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
    <Operation>/
      <Operation>Command.cs | Query.cs     a record; nested input records live in the same file
      <Operation>CommandHandler.cs | QueryHandler.cs
      <Operation>CommandValidator.cs | QueryValidator.cs      whenever the request carries input
      <Operation>CommandExtensions.cs      extension methods ToModel(…) / ApplyTo(entity) / To<Entity>Data(): command → domain input
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
- `ToModel`/`ApplyTo` are extension methods on the command and keep the handler reading as
  orchestration; conversion helpers with a natural receiver prefer them too. The mapping only calls
  the domain's public factories and behaviour, it adds no rule
  ([0007](../../docs/adr/0007-direct-command-binding-and-mapping-extensions.md)). A root with many
  members takes an `<Entity>Data` record instead (`ClientData`): the extension only builds it
  (`To<Entity>Data()`) and the handler calls `Create` / `Update` itself
  ([0059](../../docs/adr/0059-aggregate-data-records-and-handler-owned-domain-calls.md)).

**A use case owns its orchestration**
([0049](../../docs/adr/0049-conventions-for-new-backend-slices.md)). One handler per operation, no base
handler, and no class between handlers that orchestrates — no loader, manager, service or helper. What
two handlers share has a home: a rule goes to the domain, a read to a repository method, a mapping to
`<Entity>Response.From<Entity>`. A few orchestration lines repeated between the create and the edit of the
same aggregate are accepted, and so is an input rule repeated between their validators (§4).

**Inputs and outputs are explicit records.** The input is the command or query record itself and its
nested `<Thing>Input` records: primitives, strings, `DateOnly`, ids and the shared string value objects
(`CpfNumber`, `FullName`, `PhoneNumber`, `EmailAddress`, `BirthDate`, `AdministrativeNotes`, `SearchText`) and enums (§6) — no other domain type,
no tenant. The
output is `<Entity>Response` with a static `From<Entity>(entity, …)`, built from the aggregate plus what
the handler read explicitly for it; another aggregate appears as a small `<Entity>Summary`. In a
response, a value object flattens to its primitive, and an enum stays the enum: the kernel's converter writes it as a
camelCase string (§6), so the mapping never calls `ToString()` on it. No mapping library, no DTO in the domain, no
entity past the handler.

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
several values (a duration range), a closed set that carries a rule (a palette with a format), a rule that needs a parameter (a birth date
and today), when it is money or a percentage, or when more than one type uses its rule. Free text bounded
only by its length (a name, a description) **may** stay a primitive, validated by its owner with a named
`DomainError`. The column stores the normalized value.

A set of independent options with no rule beyond membership (the purposes of a contact) is not a value
object ([0058](../../docs/adr/0058-closed-set-members-are-plain-enums.md)): the options are a plain enum,
and the entity holds an `IReadOnlySet<TEnum>` of them, keeps its own copy, and refuses an empty set and a
value that is not a member with named errors, in `Create` and in every behaviour that replaces the set.

**Shared value objects** ([0055](../../docs/adr/0055-shared-string-value-objects.md)) live in
`Admin.SharedKernel.ValueObjects` when the value has a format and no business context (CPF, full name,
phone, e-mail, birth date, administrative notes). They
behave like a scalar on the wire: a `sealed record` implementing `IStringValueObject<T>`, with `Value`,
`Restore` and a `Create(raw)` that returns a `ParseResult<T>` — the value, or the pt-BR message of the
rule that failed; no `DomainResult`, no `DomainError`, no `Parse`. A blank string is not a value —
`Create("")` fails — and an optional member is nullable. What a blank means is the type's to say:
`BlankIsAbsent` (default `true`) binds it to `null`, for an optional field; a type that declares it
`false` (`FullName`) answers its own message instead. The kernel does the rest for every implementer: the JSON converter
(`AddValueObjectConverters`), the OpenAPI `string` schema (`MapValueObjectsToStrings`) and the column
conversion (`AddValueObjectConversions`, called from the `DbContext`'s `ConfigureConventions`). Only
`HasMaxLength` is written in the entity configuration. A command may carry one (`CpfNumber? Cpf`, `FullName FullName`); it
needs no validator rule and no call in `ToModel`. Binding stops at the first invalid value, so a body with
two invalid fields answers one at a time. A string one is read from a query or a route only when it declares
`[TypeConverter(typeof(StringValueObjectTypeConverter<T>))]` (`SearchText` does; personal data never does, because a URL
ends up in logs): a bad value answers `400 Validation.Failed` under the parameter with its own message
([0065](../../docs/adr/0065-string-value-objects-in-a-query-or-route.md)). To add one: the type in that project and its tests in
`Admin.SharedKernel.Tests`. A date whose rules depend on the day (`BirthDate`) implements
`IDateValueObject<T>` instead — `Create(date, today)`, with `today` read at binding from the container's
`TimeProvider` (the same one the handlers use, [0045](../../docs/adr/0045-backend-works-in-utc.md)) and the same
three pieces from the kernel. A value that is neither a string nor a date stays in the service, with
`Create`.

**Errors.** `DomainError(Code, Message)`, declared once per rule as `static readonly` on the type that
owns it. The code is `<Type>.<Rule>` and talks about the value, not about who uses it
(`Client.GuardianRequired`, `ClientReferenceContact.PurposesRequired`), so it can be reused elsewhere. Messages are pt-BR.

**Lifecycle.** "Deleted" is `BaseEntity`'s soft delete and nothing else: a repository `Remove`s, the
save interceptor stamps `DeletedAt`, the query filter hides the row, a deleted id answers 404. Never
add a `Deleted` status beside it. Other states are an enum on the entity, stored as text.

**What the domain does not know**: the tenant (assigned on save, §5), the wire format (§6), the clock
(`today` is a parameter, §7), persistence, and other aggregates — a rule that needs another aggregate
or the current state of the database belongs to the handler (§4). Ids are `Guid.CreateVersion7()`: a
root's by its caller (`ToModel`) or, for a root created from an `<Entity>Data`, by its own `Create`;
a child's by its own internal factory.

## 4. Errors — one pipeline, five gates

Expected outcomes are values; only the unexpected throws
([0014](../../docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md)). Each gate owns a
different kind of rule:

| #   | Gate                                                    | Owns                                                                                    | Answers                                                                                                                                                                                       |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Model binding (framework), and the shared value objects | JSON syntax and types; the format of a shared value object (`CpfNumber`)                | 400 `Validation.Failed` in the canonical shape, the failure under its field with the code `Validation.Failed`: the framework's English message, or the pt-BR message of a shared value object |
| 2   | Validator, run by the dispatcher                        | input shape: required, length, format, range, list size, cross-field within the request | 400 `Validation.Failed`, `errors` keyed by property; the response writes each path in camelCase ([0051](../../docs/adr/0051-camelcase-error-keys-on-the-wire.md))                             |
| 3   | Domain, `Create`/behaviour → `DomainResult`             | the same invariants again, plus rules over the whole aggregate                          | 400 through `DomainErrorMapper`, the domain's code at the top and its message under the empty key                                                                                             |
| 4   | Handler                                                 | current state: existence, uniqueness, in use, other aggregates                          | `NotFound` 404, `Conflict` 409                                                                                                                                                                |
| 5   | Unit of work, `PersistenceResult`                       | recognized persistence failures                                                         | 409 `<Entity>.SaveFailed`, generic; unrecognized failures propagate to the exception boundary                                                                                                 |
| —   | Anything else                                           | —                                                                                       | exception → `GenericExceptionHandler` → generic 500                                                                                                                                           |

**Validator.** Synchronous; no repository, no I/O
([0012](../../docs/adr/0012-revert-cross-aggregate-checks-to-handlers-and-domain.md)). Every rule
carries the domain's code with `.WithErrorCode(<DomainError>.Code)` and its own pt-BR message naming
the field; limits come from the domain's constants. It restates the rule rather than calling the
domain to decide, and reuses the code, so a rule answers the same code whichever gate catches it. A
rule two validators share is written in both: there is no `<Feature>RuleBuilderExtensions`
([0061](../../docs/adr/0061-validators-write-their-own-rules.md)). The domain's constants and codes keep the copies
aligned, and each validator's tests assert the code.

**Domain.** Defence in depth. Its messages are the fallback; the validator's are what the user
normally sees.

**Handler.** Pre-checks read through the normal query filters, `AsNoTracking`. A conflict a form can
show under an input is keyed by the property: `Error.Conflict(code, message, field: "<Property>",
meta)`, with `meta` carrying machine context such as the existing record's id and name. One conflict
per answer, in a fixed order. Cheap rejections run before work with side effects (consuming a
sequence, calling out).

**Unit of work.** The service's unit of work recognizes expected database failures and logs them at
`Warning` with kind and constraint; the handler only answers `Error.Conflict("<Entity>.SaveFailed", "Não foi possível salvar … Tente
novamente.")` — no field, no claim about which rule broke, no logger. Application never knows a constraint or index name; the retry goes
through the pre-checks and gets the specific answer
([0048](../../docs/adr/0048-database-failures-are-generic-to-the-user.md)).

**Exceptions** remain for: missing configuration at startup, programmer-error guards (`.Value` of a
failed result, `AssignTenant(Guid.Empty)`, a save with no tenant), an unrecognised database error,
and transactional cleanup. Trace a handler's `try/catch` to its actual responsibility: expected
business failures remain results, while persistence translation belongs in the unit of work.
The syntax alone does not establish a defect or its severity.

**What dies in gate 1** — malformed JSON, a non-nullable member absent from the body, a value of the
wrong JSON type, an unknown JSON enum — reaches the client in the canonical shape
(`AddModelStateProblemDetails`), but with the framework's English message and the generic code
`Validation.Failed`; only a shared value object and an enum read from a query or a route bring their own pt-BR
message. An enum is bound by name (§6), so an unknown name dies here too. In a body, the JSON converter can also yield a
value that is not a member (several names in one string), which the validator refuses with `IsInEnum`; from a query or
a route the kernel's binder accepts exactly one name, so a number or several names die here
([0066](../../docs/adr/0066-enums-read-from-a-query-or-a-route-by-one-name.md)). A failed body read also
carries the framework's entry for the body parameter (`command`), which the backend does not remove.
The shape is described in [`docs/API.md`](../../docs/API.md) §4.3.

**Codes and messages.** `code` is English (`<Type>.<Rule>`, `<Entity>.<Reason>`) and is the contract
clients branch on. Messages are pt-BR copy written for the end user; the frontend shows them as they
come and never branches on them. The wire shapes of every error: [`docs/API.md`](../../docs/API.md).

## 5. Tenancy and persistence

**Tenant.** From the validated token, only. The tenant-owned service registers
[TenantHeaderFilter](../shared/Admin.Identity.Client/TenantHeaderFilter.cs), which refuses a
missing/malformed header, missing claim or mismatch before the action. `[IgnoreTenant]` bypasses
this comparison and requires an explicit authorization rationale; it is not an anonymous-access
policy. Commands, queries, DTOs, mappings and business repository methods do not accept a
client-selected tenant. Trusted accessors, internal adapters and isolated test doubles are different
seams: trace their source rather than rejecting every tenant parameter by name.

The [save interceptor](../services/services-service/ServicesService.Infrastructure/Persistence/Interceptors/AuditableEntitySaveChangesInterceptor.cs)
fills an empty tenant on `Added` entities and throws if no current tenant is available. It does
not replace or revalidate a preassigned tenant, nor validate the ownership of every modified row.
Do not use this mechanism as permission to attach a client-selected graph
([0006](../../docs/adr/0006-tenant-header-base-entity-generic-repository.md),
[0008](../../docs/adr/0008-automatic-tenant-assignment-on-save.md),
[0009](../../docs/adr/0009-tenant-owned-entity-base-class.md)). The bearer keeps the claim names the token carries,
so `tenant_id` is the tenant and `sub` the actor the interceptor stamps on `CreatedBy`, `UpdatedBy` and `DeletedBy`
([0081](../../docs/adr/0081-bearer-keeps-token-claim-names.md)). Review checklist and the
model-cache trap of the query filter: skill
[`agenza-tenant-isolation`](../../.claude/skills/agenza-tenant-isolation/SKILL.md).

**Query filters.** [ApplyAuditableConventions](../shared/Admin.SharedKernel.EntityFrameworkCore/ModelBuilderExtensions.cs), called from `OnModelCreating`, gives every
`BaseEntity` a `SoftDelete` filter and every tenant-owned one a `Tenant` filter, plus their indexes
([0046](../../docs/adr/0046-separate-soft-delete-and-tenant-query-filters.md)). No repository ignores
either; `IgnoreQueryFilters()` belongs to a persistence test that asserts a soft delete.
The filter expression must reference the current context's `CurrentTenantId` property, not embed
a tenant Guid constant in the model EF caches by context type. The
[ServicesDataContext](../services/services-service/ServicesService.Infrastructure/Persistence/ServicesDataContext.cs)
captures its scoped provider at construction and uses `Guid.Empty` when absent; that is not an
unscoped query. Test different contexts sharing the model when changing this expression.

Composite FKs constrain relationships within a tenant. PostgreSQL roles restrict each service to
its schema; they do not isolate tenant rows by themselves. The init scripts, migrations and
runtime query/write path are separate parts of the boundary (§11).

**Entity configuration** — one `IEntityTypeConfiguration<T>` per entity:

- A tenant-owned principal exposes `HasAlternateKey(e => new { e.TenantId, e.Id })`; a relationship
  between tenant-owned entities is the composite FK `(TenantId, <Parent>Id) → (TenantId, Id)`. An
  `Id`-only FK between two tenant-owned entities is a finding.
- Value objects: `HasConversion(v => v.Value, s => <Vo>.Restore(s))` for the service's own; the shared
  ones are converted by `AddValueObjectConversions()` in `ConfigureConventions`. Lengths from the value
  object's constants, never literals. No EF complex types — the InMemory persistence tests do not
  support them.
- Enums: text, with a `CHECK` built from `Enum.GetNames<T>()`. A set of options kept in one column is the
  sum of the members' fixed codes, with a `CHECK` on the range and a `ValueComparer` by set equality; a
  stored value that no rule would accept today still reads back.
- Uniqueness: a unique index that includes `TenantId` and filters `"DeletedAt" IS NULL`, plus any
  predicate of the rule itself. The index is the authority; the handler's pre-check only exists to
  give the per-field answer. Case-insensitive uniqueness follows what is displayed: when the
  normalized value is what the interface shows (an e-mail in lowercase, CPF digits), the column stores
  it; when the display keeps the user's form (a name with its casing), the index uses a generated
  normalized column ([0049](../../docs/adr/0049-conventions-for-new-backend-slices.md)).
- Children: `HasMany(…).WithOne()` with the composite foreign and principal keys, navigation through
  the backing field. A child's factory mints its technical key and the configuration is `ValueGeneratedNever()`:
  for a key EF thinks
  the store generates, a child added to a loaded root is tracked as `Modified` and its save fails
  ([0056](../../docs/adr/0056-clients-edit-replaces-contact-composition.md)).
- Soft-delete and tenant filters and their indexes come from the convention — never by hand.

**Repositories.** One per aggregate root — never one for a child. The port `I<Entity>Repository` lives
in `Application/Abstractions` and declares only what a handler calls; the adapter extends
`RepositoryBase<T>` in Infrastructure. It returns its own root with its children, a list or a page
of them (each root whole there too, because `UpdateAsync` stages the children the root holds), a `bool` or a count —
never a DTO, an `IQueryable` or another aggregate. Methods say what they
are for (`FindActiveByEmailAsync`), take value objects for value-object columns, and use
no tracking for reads. `ServicesDataContext` sets that behavior globally; shared helpers may preserve
it explicitly for a service outside that decision. A command loads its aggregate with `GetByIdAsync`,
applies the domain behaviour, then stages persistence with `UpdateAsync`; the port does not expose EF
tracking. An EF adapter makes any required state changes explicitly inside that operation. Paged reads
take a `PageRequest` — or the filter of the list, a record that extends it with the list's plain filters — and return a
`PagedResult<T>` through `ListPagedAsync`, whose filter-and-order function returns an `IOrderedQueryable<T>` ([0064](../../docs/adr/0064-paged-reads-page-request-and-paged-result.md)). The tenant
and soft-delete filters come from the `DbContext`: a repository never writes a `TenantId` or
`DeletedAt` predicate. A query cannot reach `.Value` through a converter: compare whole value objects or order by the
property. Matching or sorting a value-object column as text — `EF.Property<string>` over it throws — goes through a
stored generated `string` column (`lower("FullName")`) added by an additive migration
([0063](../../docs/adr/0063-clients-list-and-search-contract.md)). Repositories
only stage (`Add`, `UpdateAsync`, `Remove`); the handler commits through `IUnitOfWork`, whose shape follows the
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
- Enums travel as camelCase strings: a plain enum, named by the kernel for every enum with integers
  refused (`AddEnumNameConverter`, registered by `AddWireFormat()` in the MVC options and in the
  minimal-API options, which the OpenAPI generator reads). From a query or a route, the same call's binder reads
  exactly one name in any case and refuses a number or several names, with a pt-BR message that lists the names
  ([0066](../../docs/adr/0066-enums-read-from-a-query-or-a-route-by-one-name.md)). Nothing to register per enum, no
  translation class and no values chosen to dodge the parser. Each item of a list of enums in a body has an `IsInEnum`
  rule with the domain's code ([0058](../../docs/adr/0058-closed-set-members-are-plain-enums.md)).
- The wire is camelCase English; calendar dates are `DateOnly` (`yyyy-MM-dd`), and a date value object also reads an instant, keeping its day as
  written ([0078](../../docs/adr/0078-calendar-date-sent-as-an-instant-keeps-its-written-day.md)); instants are UTC.
- The query of a paged list extends `PagedQuery` (`Page` and `PageSize`, with the `PageRequest` defaults, unguarded) and
  its validator writes the three rules
  (page at least 1, size from 1 to `PageRequest.MaxPageSize`, offset within `PageRequest.OffsetFits`) with the shared
  `Paging.*` codes; the query's own `ToFilter()` method builds the list's filter (`ClientListFilter`, a `PageRequest` with the
  plain filters; it maps into an Application record, not into the domain, so there is no extension file as for a command), the port takes it and returns `PagedResult<T>`, and the handler `Map`s it to the response.
  A free-text search is a `SearchText`. An unpaged list returns `IReadOnlyList<T>`. A page past the last answers `200`
  with no items ([0064](../../docs/adr/0064-paged-reads-page-request-and-paged-result.md)).

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
Apply the convention to new or necessarily changed logic. An unrelated older pattern is not an
automatic refactoring task; explain any conversion needed for the requested behavior or safety.

No "what" comments and no XML doc comments; a one-line "why" only for a genuine race or a non-obvious
constraint (root [`AGENTS.md`](../../AGENTS.md)). Rationale belongs in an ADR.

### Logging

Inject `ILogger<T>` and write a message template with named placeholders, never an interpolated string. Serilog is
the pipeline behind it, owned by `Admin.Logging` and brought in by `AddServiceDefaults()`
([0054](../../docs/adr/0054-serilog-readable-console-logging.md)). Domain remains free of logging packages.
Application code that needs a logger uses `Microsoft.Extensions.Logging.Abstractions`, as declared
by its project; Infrastructure and hosts use the injected abstractions too. Nothing in those layers
calls the static Serilog `Log`. The default levels live in
`Admin.Logging`; a host that needs another level sets it under `Serilog:MinimumLevel` in its `appsettings.json`, and drops a
noisy message by text with `Serilog:Filter` (identity-service does, for OpenIddict's request dumps)
(`Logging:LogLevel` is ignored). A message carries constraint names, codes and ids, not request input; when it must,
strip control characters first (CWE-117), as `GenericExceptionHandler` and the request line do.

## 9. Tests

| Tier           | Project                                   | Scope and limits                                                                                                                                 | Tools                                                       |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Unit           | `<Service>.Tests`                         | Rule/handler/validator/binding behavior through the cases actually asserted; mocks do not prove the database or JWT boundary                     | xUnit, AwesomeAssertions, NSubstitute, fixed `TimeProvider` |
| Persistence    | `<Service>.PersistenceTests`              | EF tenant assignment, query filters and conversions through existing cases; relational metadata assertions do not execute PostgreSQL constraints | EF InMemory                                                 |
| Contract smoke | the API-contract job in `frontend-ci.yml` | Fresh migration chain, selected real OIDC requests and generated type drift; not every HTTP/SQL invariant                                        | Aspire AppHost                                              |

Line coverage of Domain + Application has a gate in `Directory.Build.props`; local `dotnet test`
uses the same coverage configuration as CI ([`docs/QUALITY.md`](../../docs/QUALITY.md)). Warnings are errors.
Line coverage is not evidence that every rule or branch has been tested. Select tests by changed
behavior and risk, including rejection paths and absence of unintended persistence. For input
rules, assert the code; use a fixed clock when the day matters.

There is no Testcontainers or in-process HTTP test project
([0026](../../docs/adr/0026-remove-dedicated-runtime-tests.md)). What only PostgreSQL can prove — a
filtered unique index under concurrent writes, a composite FK, a `CHECK` — is verified by hand
against a **disposable** PostgreSQL initialised from `infra/postgres/init/`, never against the
`agenza-postgres-data` volume that Aspire keeps for development, and the PR says what was run.
This is the current verification policy, not an automated guarantee of those properties.
Revisiting it is separate work; documentation cleanup does not add a test tier or relax a gate.
For Markdown-only changes, check references, formatting and the diff rather than start the stack.

## 10. Reference code and the older generation

Different generations coexist. Use the relevant example, inspect its callers and compare it with
the convention in §§2–8. A disagreement needs investigation; it does not automatically expand the
task into a migration of unrelated code.

- Handler orchestration, field conflicts and save failure:
  [CreateClientCommandHandler](../services/services-service/ServicesService.Application/Clients/CreateClient/CreateClientCommandHandler.cs).
- Input validation with stable codes:
  [CreateClientCommandValidator](../services/services-service/ServicesService.Application/Clients/CreateClient/CreateClientCommandValidator.cs)
  and [UpdateClientCommandValidator](../services/services-service/ServicesService.Application/Clients/UpdateClient/UpdateClientCommandValidator.cs).
- Aggregate invariants, children and named errors:
  [Client](../services/services-service/ServicesService.Domain/Entities/Client.cs) and
  [ClientConfiguration](../services/services-service/ServicesService.Infrastructure/Persistence/Configurations/ClientConfiguration.cs).
- Many-to-many between aggregates kept by id:
  [ClientTag](../services/services-service/ServicesService.Domain/Entities/ClientTag.cs) and
  [ClientTagConfiguration](../services/services-service/ServicesService.Infrastructure/Persistence/Configurations/ClientTagConfiguration.cs),
  with tenant-composite foreign keys ([ADR 0088](../../docs/adr/0088-clients-tags.md)).
- Shared scalar value object:
  [CpfNumber](../shared/Admin.SharedKernel.ValueObjects/CpfNumber.cs); context-specific values stay in
  [the service's ValueObjects](../services/services-service/ServicesService.Domain/ValueObjects/).
- Composition update:
  [UpdateClientCommandHandler](../services/services-service/ServicesService.Application/Clients/UpdateClient/UpdateClientCommandHandler.cs)
  and [ClientRepository](../services/services-service/ServicesService.Infrastructure/Repositories/ClientRepository.cs).
  The replacement semantics are recorded in [ADR 0056](../../docs/adr/0056-clients-edit-replaces-contact-composition.md).
- Read by id and state transitions:
  [GetClientById](../services/services-service/ServicesService.Application/Clients/GetClientById/),
  [DeactivateClient](../services/services-service/ServicesService.Application/Clients/DeactivateClient/)
  and [ReactivateClient](../services/services-service/ServicesService.Application/Clients/ReactivateClient/).
- Paging and search:
  [ListClients](../services/services-service/ServicesService.Application/Clients/ListClients/),
  the repository above and
  [ListTags](../services/services-service/ServicesService.Application/Tags/ListTags/).
- Soft deletion:
  [DeleteClientCommandHandler](../services/services-service/ServicesService.Application/Clients/DeleteClient/DeleteClientCommandHandler.cs).

Some older operations still use persistence-error mappers, uncoded validator rules or cross-aggregate
navigations. Their presence is not a precedent for new code. Explain a conversion needed for the
requested behavior or safety; a description fix does not rewrite tag relationships.
Update an example when it stops demonstrating its concern.

## 11. What enforces what

| Property                                                    | Current mechanism and limit                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Available dependencies                                      | Current `.csproj` references and compilation; no rule prevents adding a forbidden reference                                                                                |
| Warning-free build                                          | `TreatWarningsAsErrors` in [Directory.Build.props](../Directory.Build.props)                                                                                               |
| Unit line coverage                                          | Coverlet configuration in [Directory.Build.props](../Directory.Build.props) and [Directory.Build.targets](../Directory.Build.targets); not semantic or relational coverage |
| Token/header correspondence                                 | JWT validation and the registered `TenantHeaderFilter`; not proof of ownership for an arbitrary attached graph                                                             |
| Tenant query scope and empty-tenant assignment on insertion | Context filters and interceptor; [PersistenceTests](../services/services-service/ServicesService.PersistenceTests/) exercise their cases with EF InMemory                  |
| Relationships, unique indexes, CHECKs and schema privileges | Defined in configuration/migrations/init scripts; actual PostgreSQL enforcement and concurrency need the verification in §9                                                |
| Frontend type contract                                      | `generate:api-types:check` in [frontend CI](../../.github/workflows/frontend-ci.yml); no proof of all HTTP behavior                                                        |
| Fresh migration chain and selected OIDC flow                | The API-contract job and [smoke script](../../scripts/smoke_oidc_contract.py)                                                                                              |
| Remaining conventions                                       | Review of the affected rule and its observable consequence; no general architecture guard                                                                                  |

ADRs 0022, 0024, 0026 and 0028 list an "architecture guard" among their fitness functions. That script was
removed with the agent-governance framework (`bfd16b8`,
[ADR 0016](../../docs/adr/0016-ai-agent-governance-framework.md)) and nothing replaced it. Don't
count on a check to catch what review misses.

## 12. Deliberately absent

These are recorded choices. Consult the relevant ADR when a requirement justifies changing one;
ordinary implementation details do not each need another architecture document.

- Dispatcher and dependency choices:
  [ADR 0005](../../docs/adr/0005-cqrs-vertical-slice-result-pattern.md).
  Current packages come from the project files and central pins; a historical licensing rationale
  is not a current package/license inventory.
- Generic CRUD/base handlers, orchestration between handlers, builder/factory classes and mapping
  libraries: [ADR 0049](../../docs/adr/0049-conventions-for-new-backend-slices.md).
  The existing shapes are in §§2–3; names alone do not determine review severity.
- Validator bases or shared rule-builder extensions:
  [ADR 0061](../../docs/adr/0061-validators-write-their-own-rules.md).
  Constants/codes are shared while each validator writes its rules.
- Cross-aggregate navigations and performance mechanisms without a concrete need:
  [ADR 0049](../../docs/adr/0049-conventions-for-new-backend-slices.md).
  Use the boundaries and persistence policy in §§3/5.
- Business exceptions and monadic Result helpers:
  [ADR 0014](../../docs/adr/0014-result-pattern-domain-and-persistence-no-exceptions.md).
  The proposal to merge several conflicts in one answer is recorded in
  [ADR 0044](../../docs/adr/0044-clients-aggregate-uniqueness-and-conflict-contract.md).
- Repository-backed validators and messages inferred from database constraint names:
  [ADR 0012](../../docs/adr/0012-revert-cross-aggregate-checks-to-handlers-and-domain.md)
  and [ADR 0048](../../docs/adr/0048-database-failures-are-generic-to-the-user.md).
- A separate Deleted status and EF complex types:
  [ADR 0044](../../docs/adr/0044-clients-aggregate-uniqueness-and-conflict-contract.md);
  membership-only value objects, enum translation classes and flags:
  [ADR 0058](../../docs/adr/0058-closed-set-members-are-plain-enums.md).
- Repository bypass of tenant scope:
  [ADR 0046](../../docs/adr/0046-separate-soft-delete-and-tenant-query-filters.md).
  A future deleted-row read must preserve tenant scope and follow that decision.
- Local-zone business time:
  [ADR 0045](../../docs/adr/0045-backend-works-in-utc.md).
  See §7 and the calendar-date amendment in
  [ADR 0078](../../docs/adr/0078-calendar-date-sent-as-an-instant-keeps-its-written-day.md).
- Dedicated Testcontainers/WebApplicationFactory tier:
  [ADR 0015](../../docs/adr/0015-remove-integration-tests-unit-tests-only-in-ci.md)
  and [ADR 0026](../../docs/adr/0026-remove-dedicated-runtime-tests.md).
  The current alternative and its limits are in §9.

Do not assume a fine-grained panel permission model. Inspect the endpoint's actual policy: M2M
scopes and tenant/token checks have their own boundaries, described in
[tenant isolation](../../.claude/skills/agenza-tenant-isolation/SKILL.md).
