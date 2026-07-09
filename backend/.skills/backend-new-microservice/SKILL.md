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
   (Domain, Application, Infrastructure, Api, Tests, IntegrationTests)
   with your service's name. Both `services-service` and
   `identity-service` are real, fully-built services — mirror either's
   patterns for the *content* of each project (rich domain entities,
   use cases, EF Core repositories, thin controllers).

2. **Add to the solution**:
   `dotnet sln backend/AdminBackend.slnx add <each new csproj>`

3. **Wire references** (Domain: none; Application → Domain +
   `shared/Admin.SharedKernel` (CQRS/Result, docs/adr/0005) +
   `FluentValidation.DependencyInjectionExtensions`; Infrastructure →
   Application; Api → Application + Infrastructure +
   `shared/Admin.Identity.Client` + `ServiceDefaults` +
   `Asp.Versioning.Mvc`; Tests → Application + Domain, plus
   `coverlet.msbuild`, `AwesomeAssertions`, `xunit`,
   `Microsoft.NET.Test.Sdk`, `xunit.runner.visualstudio` (global
   `<Using Include="AwesomeAssertions" />` too) — copy the ItemGroup from
   an existing Tests csproj; the 80% coverage gate from
   `backend/Directory.Build.props`/`.targets` applies to any `*.Tests`
   project automatically, with `Admin.SharedKernel` already excluded).
   Once the service has real endpoints, add a `<Service>.IntegrationTests`
   project too (copy `ServicesService.IntegrationTests`: Mvc.Testing +
   Testcontainers.PostgreSql + AwesomeAssertions,
   `public partial class Program;` in the Api's Program.cs; add a
   `TestAuthHandler` since this new service is a resource server, not an
   OIDC provider).

4. **Auth**: in `Program.cs`, call
   `AddIdentityServiceAuthentication(builder.Configuration, "<audience>")`
   from `Admin.Identity.Client`; register the audience as a scope in
   identity-service's `Program.cs` + `DatabaseSeeder`. Read tenant id
   only via `ITenantAccessor`.

5. **CQRS/Application wiring**: in `Program.cs`, call
   `builder.Services.AddSharedKernel()` then your service's own
   `AddXApplication()` extension (copy
   `ServicesService.Application/DependencyInjection.cs` - assembly-scans
   for command/query handlers and FluentValidation validators, so new
   slices need no registration). See `backend-use-case` skill for how to
   build the first vertical slice.

6. **API versioning**: in `Program.cs`, add
   `builder.Services.AddApiVersioning(options => { options.DefaultApiVersion
   = new ApiVersion(1, 0); options.AssumeDefaultVersionWhenUnspecified =
   true; options.ReportApiVersions = true; }).AddMvc();`. Every business
   controller gets `[ApiVersion("1.0")]` +
   `[Route("api/v{version:apiVersion}/...")]`.

7. **Persistence**: one shared Postgres instance, one schema per service.
   In `OnModelCreating`: `modelBuilder.HasDefaultSchema("<service-name>")`
   (pattern: `IdentityDataContext`). Connection string key:
   `ConnectionStrings__Default` pointing at the shared `postgres` service.
   Define your own `IUnitOfWork` shape in `Application/Abstractions/`
   matching what this service's writes actually need (docs/adr/0005) —
   don't assume either existing service's shape fits.

8. **Observability**: `builder.AddServiceDefaults()` +
   `app.MapDefaultEndpoints()` (health checks + OpenTelemetry come free).

9. **Docker**: copy `identity-service`'s `Dockerfile` (build context is
   `backend/`), add the service to `infra/docker-compose.yml` and to
   `backend/AppHost/AppHost.cs` for Aspire local dev.

10. **CI**: nothing to do — `backend-ci.yml` builds/tests the whole
    solution and the coverage gate applies automatically. Add the new
    Dockerfile directory to `.github/dependabot.yml`'s docker entry.

11. **Docs**: add the service to `docs/MONOREPO.md`'s tree and note its
    context in `docs/VISION.md`.
