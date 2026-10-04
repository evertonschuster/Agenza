# Persistence — repository, configuration, migration

Rules: [ARCHITECTURE §5](../../../../backend/docs/ARCHITECTURE.md#5-tenancy-and-persistence). Tenant
review: skill `agenza-tenant-isolation`. Code to copy: §10 row "Aggregate with children…". This file
is how to write each piece.

## 1. The port — `I<Entity>Repository`

One per aggregate root, in `Application/Abstractions/`, declaring only what a handler calls **now** —
no `Remove` until a delete exists, no `ListAsync` until a list exists.

| Method family | Returns | Use |
| --- | --- | --- |
| `GetByIdAsync(id)` | `T?`, tracked, with its children | load to change or to show |
| `Find<Criterion>Async(valueObject)` | `T?`, `AsNoTracking` | pre-check lookups (`FindByCpfAsync`) |
| `<Thing>ExistsAsync(…)` | `bool` | a pre-check that needs no record back |
| `CountBy<Thing>Async(id)` | `int` | an "in use" rule |
| `GetByIdsAsync(ids)` | `IReadOnlyList<T>` | one query for a set — never one per row |
| `ListAsync(filters)` | `IReadOnlyList<T>` | an unpaged list, ordered |
| `ListAsync(page, pageSize, filters)` | `(IReadOnlyList<T> Items, int TotalCount)` | a paged list, ordered |
| `Add(entity)`, `Remove(entity)` | `void` | stage; the handler commits |

Parameters are ids, value objects for value-object columns and plain filter values — never a tenant,
an expression, an `IQueryable` or a specification. Results are the root with its own children — never a
DTO, a projection or another aggregate.

A `GetByIdAsync` shared by a query and a command stays tracked: `AsNoTracking` is required only on
pre-check lookups (`Find…Async`), and a second method that differs only by tracking is the premature
optimization this codebase avoids (ARCHITECTURE, rules of thumb).

## 2. The adapter — `<Entity>Repository`

- `public class <Entity>Repository : RepositoryBase<<Entity>>, I<Entity>Repository`, constructed from
  the service's `DbContext`; registered in Infrastructure's `DependencyInjection.cs`.
- Use the base helpers (`FindAsync`, `ListAsync`, `ListPagedAsync`, `AnyAsync`) and `Set` for the
  rest. `Include` only the root's own children.
- Order every list and page explicitly, on a key that is unique or ends in one — otherwise rows repeat
  or vanish between pages.
- A value-object column is compared as a whole (`c.Cpf == cpf`); text search on it goes through
  `EF.Property<string>(e, "<Property>")`, because a query cannot reach `.Value` through a converter.
- The `DbContext` already scopes every query to the tenant and hides soft-deleted rows. A repository
  never writes a `TenantId` or `DeletedAt` predicate, never calls `IgnoreQueryFilters()`, never calls
  `SaveChanges`.

## 3. The configuration — `<Entity>Configuration`

Check each line of ARCHITECTURE §5 "Entity configuration" against your entity: composite alternate key,
composite foreign keys between tenant-owned entities, value objects through `Restore` with lengths from
their constants, enums as text with a `CHECK`, unique indexes with `TenantId` and
`"DeletedAt" IS NULL`, children through the backing field. Never add a soft-delete or tenant filter by
hand.

A set of ids of another aggregate is a child entity of the owner — its own configuration, keyed
`(TenantId, OwnerId, OtherId)`, with composite foreign keys to both roots.

## 4. Case-insensitive uniqueness — pick the column

| The interface shows… | Store | Unique index on | Pre-check compares |
| --- | --- | --- | --- |
| the normalized value (an e-mail in lowercase, CPF digits) | the value object's normalized value | the column | the value object |
| what the user typed (a name with its casing) | the typed value | a generated lowercase column | the generated column, through `EF.Property<string>` |

The index decides under concurrency. The pre-check exists only to answer with the field and `meta`.

## 5. The migration

1. `dotnet ef migrations add <Name>` from the Api folder (command in ARCHITECTURE §5).
2. Read the generated `Up` and `Down`: no drop, rename or type change of existing data unless the PR
   is about that; index filters and `CHECK`s exactly as configured; composite keys present.
3. `dotnet ef migrations has-pending-model-changes` reports nothing.
4. Never edit a migration that is already committed — write the next one.

## 6. Red flags in persistence

- a repository for a child, or a `DbSet` for one
- `TenantId`, `DeletedAt` or `IgnoreQueryFilters` in a repository
- a method returning a DTO, a projection (`Select(… new …Response`), an `IQueryable` or another root
- `Include` of another aggregate root
- `SqlQuery`, `FromSql`, `ExecuteSql`, `BeginTransaction`, a cache — without evidence in the PR
- an `Id`-only foreign key between two tenant-owned entities
- a list or page without an explicit order
- a literal length in a configuration where a constant exists
- an edited migration that was already committed
