---
name: agenza-backend-slice
description: Use when building or changing backend functionality in a .NET service under backend/services/ — modeling an aggregate, child entity, value object, state transition, factory or domain error; writing a command, query, handler, validator, mapping or response DTO; adding a repository method, EF configuration or migration; adding a controller action; writing backend unit or persistence tests; or deciding which existing slice to copy and where shared logic belongs.
---

# Building a backend slice

The rules live in [`backend/docs/ARCHITECTURE.md`](../../../backend/docs/ARCHITECTURE.md); this skill is
the order of work and the decisions you meet on the way. Two generations of slices coexist, and
**ARCHITECTURE §10 names the code to copy** — the nearest file is often the older one.

## Map

| You are about to… | Read | Rules |
| --- | --- | --- |
| model an aggregate, a child, a value object, a transition, a factory, a domain error | [references/domain.md](references/domain.md) | §3 |
| write a command or query, its validator, the mapping, the handler, the response | [references/use-case.md](references/use-case.md) | §2, §4, §6, §7 |
| write a repository method, a configuration, an index, a migration | [references/persistence.md](references/persistence.md) | §5 |
| write tests | [references/tests.md](references/tests.md) | §9 |
| review a change, yours included | skill `agenza-backend-review` | — |
| touch anything tenant-scoped | skill `agenza-tenant-isolation` | §5 |
| change a contract the frontend consumes | skill `agenza-api-contract` | §6 |

## 0. Place it, or stop

- Which business context owns it? An existing one → a `<Feature>/` folder in that service
  ([ADR 0001](../../../docs/adr/0001-context-aggregated-services.md)). A new service is an ADR first.
- A new aggregate, a child of an existing one, or an operation on an existing one? Decide with
  [references/domain.md](references/domain.md) §1 before creating any folder.
- Stop and write the decision down (an ADR, and say so to the user) when the work needs a rule
  ARCHITECTURE does not have, a new member in a shared project, a new exception type, `[IgnoreTenant]`,
  a migration that rewrites data, a time zone, or any mechanism from "Keep it simple" below.

## 1. Order of work

Inside out — each layer compiles against the one before it, and each layer's tests go with it.

1. **Domain.** Value objects, then the aggregate's factories and behaviour, then their tests.
2. **Application.** The command or query and its inputs, the validator, `ToModel`/`ApplyTo`, the
   handler, the response, the port methods the handler calls — then their tests.
3. **Infrastructure.** Configuration, repository, registration, migration; persistence tests when
   tenant assignment, a filter, a conversion or an index changed.
4. **Api.** The controller action.
5. **Contract.** Regenerate the frontend's types in the same change; touch
   [`docs/API.md`](../../../docs/API.md) only when a shape shared by every endpoint changed.
6. **Verify.**

   ```bash
   dotnet build backend/AdminBackend.slnx -c Release
   dotnet test backend/AdminBackend.slnx -c Release
   ```

   A unique index, composite FK or `CHECK` is proved by hand on a disposable PostgreSQL — never the
   `agenza-postgres-data` volume — including concurrent writes for a uniqueness rule; the PR says what
   was run.
7. **Self-review** with `agenza-backend-review`, then deliver (§4).

## 2. Keep it simple

Write the simplest correct form (ARCHITECTURE, rules of thumb): load the aggregate, change it through
behaviour, save; read through the repository and map in the handler. Do not add, without a measured
problem or a product rule named in the PR:

- a cache, a projection inside a repository, raw SQL, a compiled query, a split query;
- a transaction you open yourself, a gap-free sequence, a denormalized column;
- `Task.WhenAll` in a handler, a second repository method that differs only in tracking;
- an interface with one implementation outside `Abstractions/`, a parameter or port method no caller
  uses yet, a generic base type "for the next feature".

Two things look like optimization and are not: never a query per row (read a set of ids in one query),
and `AsNoTracking` on lookups that won't be modified.

## 3. Touching an older slice

Converting is part of touching: when your change edits something listed in ARCHITECTURE §10's "older
shape" column, bring **that part** to the current shape in the same PR, in its own commit — scoped to
what you touch, never a sweep of other slices.

## 4. Deliver

A feature that spans backend and frontend is two PRs cut from `main`, backend first; the backend PR
carries the regenerated `services-api.d.ts`. A new decision, or one tried and reverted, goes in an ADR.
A slice that becomes the better example of a concern replaces its row in ARCHITECTURE §10. No doc gets a
feature list or a "today only X does Y".
