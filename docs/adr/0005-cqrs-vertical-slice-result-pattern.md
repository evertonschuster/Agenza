# ADR 0005 — CQRS, vertical slices, Result pattern, and supporting conventions

Status: accepted (2026-07); testing convention partially superseded by
docs/adr/0006 (NSubstitute replaces the hand-written fakes described
below); FluentValidation convention further superseded by docs/adr/0010;
Domain-throws-for-its-own-invariants convention (Tag/Category/Service
only) further superseded by docs/adr/0011, reinstated by docs/adr/0012,
and finally superseded by docs/adr/0014 (Domain returns DomainResult
instead of throwing); the `IdentityService.IntegrationTests`-verified
claim in "UnitOfWork shapes" superseded by docs/adr/0015 (integration
tests removed, unit tests only in CI)

## Context

The backend's initial shape (one `UseCases/<Name>/` folder per operation,
exceptions for business-rule violations, hand-registered DI) worked for a
single use case per service but doesn't scale cleanly as more verticals
are added: naming (`Request`/`Result`/`UseCase`) doesn't distinguish reads
from writes, exceptions-for-business-errors force every caller to guess
which exception types a given operation can throw, and every new
operation needs a manual DI registration line.

## Decisions

### CQRS via a hand-rolled dispatcher, not MediatR

Commands (`ICommand`/`ICommand<TResponse>`) and queries
(`IQuery<TResponse>`) are distinct marker interfaces with their own
handler contracts (`ICommandHandler<...>`, `IQueryHandler<...>`),
resolved by a small reflection-based `IDispatcher` in
`backend/shared/Admin.SharedKernel`.

**Why not MediatR:** MediatR 13+ requires a paid commercial license for
organizations above $5M annual revenue (Lucky Penny Software, July 2025).
Given this repo's standing rule that tooling stays free (ADR 0004), and
that this project's entire dispatch need — resolve the one handler
registered for a request's concrete type, run FluentValidation first if
a validator is registered — fits in roughly 100 lines, hand-rolling it
removes the licensing question entirely rather than betting on staying
under a revenue threshold indefinitely.

### Vertical slices *within* the existing Clean Architecture layers

Each feature is a self-contained folder under the Application project:

```
Application/
  <Feature>/                    e.g. Tags/, Tenants/
    <Feature>Response.cs        shared DTO, when more than one operation returns it
    <Operation>/                e.g. CreateTag/, ListTags/
      <Operation>Command.cs     or <Operation>Query.cs
      <Operation>CommandHandler.cs
      <Operation>CommandValidator.cs
```

This is deliberately **not** a full vertical-slice rewrite that would
collapse Domain/Application/Infrastructure/Api into one project per
feature. `backend/CLAUDE.md`'s layering rule (Domain has zero project
references; dependencies point inward) is a separate, still-active
non-negotiable — slices organize *within* the Application layer, they
don't replace the layer boundary. A feature's rich domain entities still
live in `Domain/Entities/`, its EF repository in `Infrastructure/`.

### Result pattern — Application boundary, not Domain

`Result` / `Result<TValue>` / `Error` (`Admin.SharedKernel`) replace
exceptions for **expected business outcomes** a caller needs to branch
on: validation failures, not-found, conflicts, forbidden. A command/query
handler never lets one of these escape as a thrown exception; controllers
map `Result` to HTTP status/Problem Details via `ResultExtensions.ToActionResult`.

**Domain entities still throw** for their own invariant violations
(`Tag`'s constructor, `TagColor.From`, `Tenant`'s constructor) — this is
deliberate, not an oversight:

- Domain has zero project references (existing non-negotiable); it
  cannot depend on `Admin.SharedKernel`'s `Result` type without
  violating that.
- By the time a handler constructs a domain entity, FluentValidation has
  already validated the input's shape — a domain exception at that point
  means the validator and the domain disagree, which is a bug, not a
  normal business outcome. Handlers still catch it and convert to
  `Result.Failure` (defense in depth), so the *observable* API behavior
  is Result-shaped end to end; only the internal implementation detail
  (how Domain signals its own guard clauses) stays exception-based.

### FluentValidation for input shape, not business rules

Each command that takes user input gets a validator
(`AbstractValidator<TCommand>`) checking cheap, synchronous shape
concerns (required fields, length, enum/palette membership). Rules that
need a repository round-trip (name uniqueness, existence) stay in the
handler — the dispatcher runs validation *before* the handler, so a
shape failure never reaches the repository. Registered by assembly
scan (`AddValidatorsFromAssembly` in each service's
`AddXApplication()`), not listed by hand.

### UnitOfWork — shape matches the service's real transactional need, not a shared interface

`IUnitOfWork` is defined per service, not in `Admin.SharedKernel`,
because the two existing services genuinely need different shapes:

- **services-service**: `SaveChangesAsync(CancellationToken)`. Every
  write goes through one EF `DbContext`, so a single call is already
  atomic. Repositories (`Add`/`Remove`) only stage changes; the handler
  commits explicitly.
- **identity-service**: `ExecuteInTransactionAsync<TResult>(Func<...,
  Task<Result<TResult>>>, ...)`. `ProvisionTenant` writes through *two*
  different abstractions (`ITenantRepository` and `IUserAccountService`,
  the latter backed by ASP.NET Identity's `UserManager`, which commits
  internally) — only an explicit database transaction ties them
  atomically. The wrapper is Result-aware: a handler's `Result.Failure`
  rolls the transaction back exactly like a thrown exception would, so
  a duplicate owner email doesn't leave an orphaned tenant row, without
  needing an exception for that expected outcome. Verified against a
  real Postgres instance in `IdentityService.IntegrationTests`.

A future service picks whichever shape (or a new one) actually matches
its writes — don't force-fit one interface.

### AwesomeAssertions, not FluentAssertions

FluentAssertions v8+ requires a commercial license via Xceed ($129.95/
seat/year) — the same free-tooling constraint as the MediatR decision
above. **AwesomeAssertions** is a community fork of FluentAssertions
v7 (the last Apache-2.0 release), API-compatible (same `.Should()`
surface, different namespace), with an explicit commitment to never
change its license. All backend test projects use it via a global
`using AwesomeAssertions;`.

### API versioning

`Asp.Versioning.Mvc` (MIT, .NET Foundation) on every business controller:
`[ApiVersion("1.0")]` + `[Route("api/v{version:apiVersion}/...")]` (or
`internal/v{version:apiVersion}/...` for M2M-only routes).
`AssumeDefaultVersionWhenUnspecified = true` keeps an omitted version
segment working, but every real caller (the SPA, service-to-service
calls) sends it explicitly. OpenIddict's own protocol endpoints
(`/connect/authorize`, `/connect/token`, `/.well-known/...`) are
**not** versioned — those paths are fixed by the OAuth/OIDC spec and
OpenIddict's own configuration; versioning them would break discovery.

## Consequences

- New feature = new folder under `Application/<Feature>/<Operation>/`
  plus a controller action that builds a command/query and dispatches
  it — no DI registration line to remember (assembly scanning covers
  handlers and validators).
- `Admin.SharedKernel` (Result, CQRS contracts, Dispatcher, API's
  `ResultExtensions`) and `Admin.SharedKernel.Tests` are shared
  infrastructure, same category as `Admin.Identity.Client` — not
  business logic, safe to share across services (ADR 0001 still holds
  for business logic itself).
- Coverage gates: `Admin.SharedKernel` is excluded from every
  *consuming* service's `*.Tests` coverage count (`Directory.Build.targets`)
  since it has its own dedicated gate in `Admin.SharedKernel.Tests` —
  counting it twice would let one hide behind the other's number.
- `backend-use-case` and `backend-new-microservice` skills, and
  `backend/CLAUDE.md`, are updated to teach this shape as the default —
  see those files rather than duplicating the checklist here.
