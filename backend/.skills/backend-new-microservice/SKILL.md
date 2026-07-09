---
name: backend-new-microservice
description: >
  Use this skill when creating a brand-new backend service under
  backend/services/. Trigger on "new service", "new microservice", or
  when a feature clearly belongs to a business context no existing
  service owns. Encodes the project layout, solution wiring, shared
  Postgres schema convention, auth wiring, Docker, and CI expectations.
---

# New Backend Microservice

## First: does this need a new service?

Services here are **context-aggregated** (docs/adr/0001): one service per
explicit business context, and a service may own several related
capabilities. If the new capability belongs to a context an existing
service already owns, add a use case there instead (see
`backend-use-case` skill). Create a new service only for a genuinely new
context (e.g. notifications/email, billing).

## Steps

1. **Copy the five-project layout** of `services/services-service/`
   (Domain, Application, Infrastructure, Api, Tests) with your service's
   name. For the *content* of each project, mirror `identity-service` —
   it is the real reference; services-service is still template
   scaffolding.

2. **Add to the solution**:
   `dotnet sln backend/AdminBackend.slnx add <each new csproj>`

3. **Wire references** (Domain: none; Application → Domain;
   Infrastructure → Application; Api → Application + Infrastructure +
   `shared/Admin.Identity.Client` + `ServiceDefaults`; Tests →
   Application + Domain, plus `coverlet.msbuild`, `xunit`,
   `Microsoft.NET.Test.Sdk`, `xunit.runner.visualstudio` — copy the
   ItemGroup from an existing Tests csproj; the 80% coverage gate from
   `backend/Directory.Build.props` applies to any `*.Tests` project
   automatically). Once the service has real endpoints, add a
   `<Service>.IntegrationTests` project too (copy
   `IdentityService.IntegrationTests`: Mvc.Testing +
   Testcontainers.PostgreSql, `public partial class Program;` in the
   Api's Program.cs).

4. **Auth**: in `Program.cs`, call
   `AddIdentityServiceAuthentication(builder.Configuration, "<audience>")`
   from `Admin.Identity.Client`; register the audience as a scope in
   identity-service's `Program.cs` + `DatabaseSeeder`. Read tenant id
   only via `ITenantAccessor`.

5. **Persistence**: one shared Postgres instance, one schema per service.
   In `OnModelCreating`: `modelBuilder.HasDefaultSchema("<service-name>")`
   (pattern: `IdentityDataContext`). Connection string key:
   `ConnectionStrings__Default` pointing at the shared `postgres` service.

6. **Observability**: `builder.AddServiceDefaults()` +
   `app.MapDefaultEndpoints()` (health checks + OpenTelemetry come free).

7. **Docker**: copy `identity-service`'s `Dockerfile` (build context is
   `backend/`), add the service to `infra/docker-compose.yml` and to
   `backend/AppHost/AppHost.cs` for Aspire local dev.

8. **CI**: nothing to do — `backend-ci.yml` builds/tests the whole
   solution and the coverage gate applies automatically. Add the new
   Dockerfile directory to `.github/dependabot.yml`'s docker entry.

9. **Docs**: add the service to `docs/MONOREPO.md`'s tree and note its
   context in `docs/VISION.md`.
