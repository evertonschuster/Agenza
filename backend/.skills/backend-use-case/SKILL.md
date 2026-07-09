---
name: backend-use-case
description: >
  Use this skill whenever adding or changing business logic in any .NET
  backend service — a new use case, a new entity, a new repository
  method. Trigger on "add endpoint", "implement [operation]", "create
  [entity]" for anything under backend/. It encodes the project's
  layering, rich-domain, tenant-scoping, and testing conventions; do NOT
  write backend business logic without reading it first.
---

# Backend Use Case

The reference implementation is `identity-service`'s ProvisionTenant flow.
Open these files and mirror their shape:

- `IdentityService.Domain/Entities/Tenant.cs` — entity with invariants
- `IdentityService.Application/UseCases/ProvisionTenant/` — use case + Request/Result
- `IdentityService.Application/Abstractions/` — ports
- `IdentityService.Infrastructure/Repositories/TenantRepository.cs` — adapter
- `IdentityService.Tests/ProvisionTenantUseCaseTests.cs` — fake-based unit tests

## Build order (TDD — test first at each step)

### 1. Domain entity or value object

- Constructor/factory validates every invariant; throw `ArgumentException`
  or a dedicated domain exception with a clear message.
- No public setters. Add a `private` parameterless constructor ONLY if EF
  needs it, and keep it private.
- State changes go through named behavior methods (`Rename`, `Cancel`,
  `Reschedule`), each keeping the entity valid.
- Tests: plain xUnit, no fakes needed — Domain has zero dependencies.

### 2. Port (interface) in `Application/Abstractions/`

- Narrow, intention-revealing methods (`AddAsync`, `GetByIdAsync`) — not
  a generic repository.
- Every method that touches tenant-owned data takes the tenant id (or an
  aggregate that carries it) explicitly, plus a `CancellationToken`.

### 3. Use case in `Application/UseCases/<Name>/`

```
UseCases/CancelAppointment/
├── CancelAppointmentRequest.cs   (record)
├── CancelAppointmentResult.cs    (record)
└── CancelAppointmentUseCase.cs
```

- Constructor-injected ports only — no EF, no HttpClient, no ASP.NET
  types in Application.
- Multiple writes that must succeed together → wrap in
  `IUnitOfWork.ExecuteInTransactionAsync` (pattern in
  `ProvisionTenantUseCase`, including the rollback rationale comment).
- Register it in the Api's `Program.cs` (`AddScoped<XUseCase>()`).

### 4. Unit tests with hand-written fakes

- One fake class per port, defined in the test project; capture calls
  with simple lists/fields, not a mocking library.
- Test the behavior AND the failure paths (invariant violations,
  repository failures rolling back transactions).

### 5. Infrastructure adapter

- Repository implements the port via the service's `DbContext`.
- EF configuration lives in `Infrastructure/Persistence/Configurations/`.
- New tables → `dotnet ef migrations add <Name>` from the Api project
  directory (the service's tables live in its own schema —
  `HasDefaultSchema` is already set in the DbContext).

### 6. Controller (thin)

- Parse/validate transport concerns, resolve tenant via `ITenantAccessor`
  (from `shared/Admin.Identity.Client`) — never from the request payload —
  call the use case, map result to HTTP.
- `[Authorize]` by default; scope checks (`User.HasScope(...)`) for
  M2M-only endpoints (see `TenantsController`).

### 7. Integration test for the new endpoint

- In the service's `<Service>.IntegrationTests` project (pattern:
  `IdentityService.IntegrationTests` — WebApplicationFactory +
  Testcontainers Postgres, shared via `IClassFixture`).
- Minimum: unauthenticated request → 401, wrong scope/tenant → 403,
  happy path → expected status + persisted effect.

## Definition of done

```bash
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx   # coverage gate via Directory.Build.props; integration needs Docker
```

Both green, coverage gate passing, no new NU1903 (vulnerable package)
warnings in the build output.
