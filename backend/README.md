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

`services-service` (backing the "Services" feature vertical from the frontend's
`docs/STATUS.md`) is the reference implementation — copy its structure when adding a
new microservice, then add the new projects to `AdminBackend.slnx` with `dotnet sln add`.

## Commands

```bash
dotnet build AdminBackend.slnx
dotnet test AdminBackend.slnx
dotnet run --project services/services-service/ServicesService.Api
```

## Known gaps

- `ServicesService.Api` currently has no Dockerfile — add one before wiring it into
  `infra/docker-compose.yml` for real (the compose file references a path that doesn't
  exist yet).
- The webapi template pulled in `Microsoft.OpenApi` 2.0.0, which has a known advisory
  (GHSA-v5pm-xwqc-g5wc). Bump it before shipping anything real.
- No persistence/EF Core is wired yet — `ServicesService.Infrastructure` is an empty
  class library.
