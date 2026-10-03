# Backend — .NET microservices

Solution: `AdminBackend.slnx` (dotnet 10 uses the newer XML solution format instead of `.sln`).

## Layout

Each microservice lives under `services/<service-name>/` with four projects plus a test
project, mirroring the Clean Architecture layering already used by the frontend
(`apps/admin-frontend`):

```
services/<service-name>/
├── <Service>.Domain/          entities, value objects — zero project references
├── <Service>.Application/     use cases — references Domain only
├── <Service>.Infrastructure/  persistence, external calls — references Application
├── <Service>.Api/             ASP.NET Core Web API — references Application + Infrastructure
└── <Service>.Tests/           xUnit — references Application + Domain
```

Both `identity-service` and `services-service` are real, fully-built
services — mirror either's patterns for a new service's project structure.

There is also `shared/Admin.Identity.Client` — the JWT-validation +
`ITenantAccessor` library every resource service references instead of
hand-rolling token handling.

## Commands

```bash
dotnet tool restore
dotnet build AdminBackend.slnx
dotnet test AdminBackend.slnx    # unit + EF InMemory tenant persistence tests
dotnet run --project services/services-service/ServicesService.Api
```

The 80% line-coverage gate for `*.Tests` projects (Domain + Application
scope) is configured in `Directory.Build.props`, so local `dotnet test`
enforces exactly what CI enforces. `ServicesService.PersistenceTests`
(docs/adr/0019) adds Docker-free EF coverage for automatic tenant
assignment and tenant query filtering. The Aspire API-contract job applies
the migration chain to a fresh PostgreSQL database and exercises the real
OIDC boundary; there is no dedicated Testcontainers or in-process HTTP test
project (docs/adr/0026). See `../docs/QUALITY.md`.

Convenções de request/response (envelope de sucesso, formas de erro, status HTTP, casos de borda de
roteamento) verificadas ao vivo: [`../docs/API.md`](../docs/API.md).

## Code style

Methods get a block body. Branching is written as guard clauses with early
`return`s and explicit `if`s, not as `&&`/`||` chains or ternaries folded into
an expression body:

```csharp
private async Task<Error?> FindEmailConflictAsync(Client client, CancellationToken cancellationToken)
{
    if (client.Email is null)
    {
        return null;
    }

    var activeClientWithSameEmail = await _clientRepository.FindActiveByEmailAsync(client.Email, cancellationToken);
    if (activeClientWithSameEmail is null)
    {
        return null;
    }

    return ClientConflicts.Email();
}
```

Not dogma: `=>` stays for a short local function or property whose body is a
single plain expression with no branching (`DateOnly Today() => ...` in
`CreateClientCommandValidator`), and for the lambdas an API takes
(FluentValidation `.Must(...)`, LINQ). `CreateClientCommandHandler` and
`ClientConflicts` are the reference. Existing code is converted when it is
touched, not in bulk.

## Known gaps

- `ServicesService` has three complete verticals (Tags `/api/v1/tags`,
  Categories `/api/v1/categories`, Services `/api/v1/services`) and one
  partial one: Clients (`/api/v1/clients`) only creates a person with its
  linked contacts for now (`docs/adr/0044`); querying, editing and the
  situation changes arrive with issues #155–#159. The Appointments vertical
  mentioned in `apps/admin-frontend/docs/STATUS.md` is still unbuilt.
