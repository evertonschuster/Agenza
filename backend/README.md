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
services — mirror either's patterns for a new service's project
structure. Conventions and how-to guides live in [CLAUDE.md](CLAUDE.md)
and [.skills/](.skills/).

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
assignment and tenant query filtering. The Compose API-contract job applies
the migration chain to a fresh PostgreSQL database and exercises the real
OIDC boundary; there is no dedicated Testcontainers or in-process HTTP test
project (docs/adr/0026). See `../docs/QUALITY.md`.

## Known gaps

- `ServicesService` has three real verticals (Tags `/api/v1/tags`,
  Categories `/api/v1/categories`, Services `/api/v1/services`) — the
  Appointments/Clients verticals mentioned in
  `apps/admin-frontend/docs/STATUS.md` are still unbuilt.
