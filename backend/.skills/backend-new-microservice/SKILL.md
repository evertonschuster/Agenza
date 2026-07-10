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

3. **Wire references** (Domain: none — not even `Admin.SharedKernel`
   (backend/CLAUDE.md's zero-reference rule); Application → Domain +
   `shared/Admin.SharedKernel` (CQRS/Result, docs/adr/0005) +
   `FluentValidation.DependencyInjectionExtensions`; Infrastructure →
   Application + `shared/Admin.Identity.Client` (ICurrentUserAccessor for
   the audit interceptor) + `shared/Admin.SharedKernel.EntityFrameworkCore`
   (`RepositoryBase<TEntity>`, docs/adr/0006); Api → Application +
   Infrastructure + `shared/Admin.Identity.Client` + `ServiceDefaults` +
   `Asp.Versioning.Mvc`; Tests → Application + Domain, plus
   `coverlet.msbuild`, `AwesomeAssertions`, `NSubstitute`, `xunit`,
   `Microsoft.NET.Test.Sdk`, `xunit.runner.visualstudio` (global
   `<Using Include="AwesomeAssertions" />` + `<Using Include="NSubstitute" />`
   too) — copy the ItemGroup from an existing Tests csproj; the 80%
   coverage gate from `backend/Directory.Build.props`/`.targets` applies
   to any `*.Tests` project automatically, with `Admin.SharedKernel`
   already excluded).
   Once the service has real endpoints, add a `<Service>.IntegrationTests`
   project too (copy `ServicesService.IntegrationTests`: Mvc.Testing +
   Testcontainers.PostgreSql + AwesomeAssertions,
   `public partial class Program;` in the Api's Program.cs; add a
   `TestAuthHandler` since this new service is a resource server, not an
   OIDC provider).

4. **Auth**: in `Program.cs`, call
   `AddIdentityServiceAuthentication(builder.Configuration, "<audience>")`
   from `Admin.Identity.Client`; register the audience as a scope in
   identity-service's `Program.cs` + `DatabaseSeeder`. Also add
   `options.Filters.Add<TenantHeaderFilter>()` to `AddControllers` so
   every tenant-scoped resource controller is protected by default
   (docs/adr/0006) — mark any genuinely tenant-free action
   `[IgnoreTenant]`. Read tenant id via `ITenantAccessor.TenantId` (the
   filter already validated it — no `TryGetTenantId`/`Forbid()` needed in
   the action).

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
   don't assume either existing service's shape fits. Add
   `{Service}.Domain/Common/BaseEntity.cs` (copy verbatim from either
   existing service — audit fields + soft delete, docs/adr/0006) for
   every aggregate root to inherit, and copy
   `AuditableEntitySaveChangesInterceptor` into
   `Infrastructure/Persistence/Interceptors/` (wired in step 4's
   `AddWidgetServiceInfrastructure` above). After
   `ApplyConfigurationsFromAssembly` in `OnModelCreating`, call
   `builder.ApplyAuditableConventions(typeof(BaseEntity))`
   (`Admin.SharedKernel.EntityFrameworkCore`) — applies the soft-delete
   query filter + `DeletedAt` index to every `BaseEntity` automatically,
   so entity configurations never write `HasQueryFilter` by hand.

8. **Exceptions**: add `{Service}.Domain/Exceptions/BusinessException.cs`
   (copy verbatim — `Code` + `Message`, docs/adr/0006); every domain
   invariant exception inherits it. Add
   `{Service}.Api/ExceptionHandling/BusinessExceptionHandler.cs` (copy
   verbatim, only the `using {Service}.Domain.Exceptions;` changes) and
   register it in `Program.cs`:
   `builder.Services.AddExceptionHandler<BusinessExceptionHandler>();
   builder.Services.AddProblemDetails();`, then `app.UseExceptionHandler();`
   early in the pipeline (before `MapControllers`). Command handlers that
   construct/mutate a domain entity never wrap it in try/catch — see
   `backend-use-case` skill step 3.

9. **Observability**: `builder.AddServiceDefaults()` +
   `app.MapDefaultEndpoints()` (health checks + OpenTelemetry come free).

10. **Docker**: copy `identity-service`'s `Dockerfile` (build context is
    `backend/`), add the service to `infra/docker-compose.yml` and to
    `backend/AppHost/AppHost.cs` for Aspire local dev.

11. **CI**: nothing to do — `backend-ci.yml` builds/tests the whole
    solution and the coverage gate applies automatically. Add the new
    Dockerfile directory to `.github/dependabot.yml`'s docker entry.

12. **Docs**: add the service to `docs/MONOREPO.md`'s tree and note its
    context in `docs/VISION.md`.

---

## Copy-paste templates

A fictional **WidgetService** — rename throughout for your real service.
Swap `WidgetService`/`Widgets`/`widget-service` for your service/context/
kebab-case name.

### Program.cs (services-service's exact shape — copy, then adjust)

```csharp
using Admin.Identity.Client;
using Admin.SharedKernel;
using Asp.Versioning;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using WidgetService.Api.ExceptionHandling;
using WidgetService.Application;
using WidgetService.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddControllers(options =>
{
    // Secure by default: every endpoint requires a valid access token from
    // identity-service unless explicitly marked [AllowAnonymous], and a
    // tenant id (X-Tenant-Id header, verified against the token's
    // tenant_id claim) unless explicitly marked [IgnoreTenant].
    options.Filters.Add(new AuthorizeFilter());
    options.Filters.Add<TenantHeaderFilter>();
});
builder.Services.AddOpenApi();

// Maps a BusinessException escaping a handler to a 400 Problem Details
// response (docs/adr/0006, step 8 above).
builder.Services.AddExceptionHandler<BusinessExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services
    .AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
    })
    .AddMvc();

// "widget-service-api" here becomes the audience resource servers check
// and the scope name identity-service must seed (step 4 above).
builder.Services.AddIdentityServiceAuthentication(builder.Configuration, audience: "widget-service-api");

builder.Services.AddSharedKernel();
builder.Services.AddWidgetServiceApplication();       // your Application/DependencyInjection.cs (below)
builder.Services.AddWidgetServiceInfrastructure(builder.Configuration); // your Infrastructure/DependencyInjection.cs

// Only if this service migrates its own schema on startup (copy
// ServicesService.Api/Setup/DatabaseMigrator.cs):
// builder.Services.AddHostedService<DatabaseMigrator>();

var spaOrigin = builder.Configuration["Cors:SpaOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy => policy
        .WithOrigins(spaOrigin)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("spa");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapDefaultEndpoints();

app.Run();

// Exposes the implicit Program class of this top-level-statements file to
// WebApplicationFactory<Program> in WidgetService.IntegrationTests.
public partial class Program;
```

### Application/DependencyInjection.cs

```csharp
using System.Reflection;
using Admin.SharedKernel;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace WidgetService.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddWidgetServiceApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();
        services.AddValidatorsFromAssembly(assembly);
        services.AddHandlersFromAssembly(assembly);
        return services;
    }
}
```

### Infrastructure/DependencyInjection.cs (single-DbContext shape — copy services-service's)

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WidgetService.Application.Abstractions;
using WidgetService.Infrastructure.Persistence;
using WidgetService.Infrastructure.Persistence.Interceptors;
using WidgetService.Infrastructure.Repositories;

namespace WidgetService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddWidgetServiceInfrastructure(
        this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Missing 'ConnectionStrings:Default' configuration.");

        // BaseEntity audit stamping + soft delete (docs/adr/0006) - copy
        // AuditableEntitySaveChangesInterceptor from services-service or
        // identity-service verbatim, only the Domain.Common.BaseEntity
        // type it pattern-matches changes.
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<AuditableEntitySaveChangesInterceptor>();

        services.AddDbContext<WidgetServiceDataContext>((serviceProvider, options) =>
            options
                .UseNpgsql(connectionString)
                .AddInterceptors(serviceProvider.GetRequiredService<AuditableEntitySaveChangesInterceptor>()));

        services.AddScoped<IWidgetRepository, WidgetRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>(); // shape it to this service's real need - see backend-use-case skill

        return services;
    }
}
```

`WidgetRepository` extends `Admin.SharedKernel.EntityFrameworkCore.RepositoryBase<Widget>`
(docs/adr/0006) — see `backend-use-case` skill step 5.

`ICurrentUserAccessor` (needed by the interceptor above) is registered
by `AddIdentityServiceAuthentication` already if this service is a
JwtBearer resource server (step 4) — nothing extra to do. If this
service validates tokens a different way (like identity-service, the
OIDC provider itself), register `services.AddHttpContextAccessor();
services.AddScoped<ICurrentUserAccessor, HttpContextCurrentUserAccessor>();`
directly.

### csproj ItemGroups (Application project — the part that differs from a plain class library)

```xml
<ItemGroup>
  <ProjectReference Include="..\WidgetService.Domain\WidgetService.Domain.csproj" />
  <ProjectReference Include="..\..\..\shared\Admin.SharedKernel\Admin.SharedKernel.csproj" />
</ItemGroup>

<ItemGroup>
  <PackageReference Include="FluentValidation.DependencyInjectionExtensions" Version="12.1.1" />
</ItemGroup>
```

### csproj ItemGroups (Infrastructure project)

```xml
<ItemGroup>
  <ProjectReference Include="..\WidgetService.Application\WidgetService.Application.csproj" />
  <!-- ICurrentUserAccessor for the audit interceptor, RepositoryBase<TEntity>
       for repositories (docs/adr/0006) - Infrastructure-only, never
       referenced from Application/Domain. -->
  <ProjectReference Include="..\..\..\shared\Admin.Identity.Client\Admin.Identity.Client.csproj" />
  <ProjectReference Include="..\..\..\shared\Admin.SharedKernel.EntityFrameworkCore\Admin.SharedKernel.EntityFrameworkCore.csproj" />
</ItemGroup>
```

### csproj ItemGroups (Api project)

```xml
<ItemGroup>
  <PackageReference Include="Asp.Versioning.Mvc" Version="10.0.0" />
  <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="10.0.9" />
  <!-- The webapi template's Microsoft.AspNetCore.OpenApi pulls in
       Microsoft.OpenApi 2.0.0 transitively, which has a known High
       advisory (GHSA-v5pm-xwqc-g5wc) - pin the patched version directly
       (3.x breaks Microsoft.AspNetCore.OpenApi's source generators as of
       this writing, so don't jump to the latest major without checking). -->
  <PackageReference Include="Microsoft.OpenApi" Version="2.10.0" />
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.9">
    <!-- dotnet-ef requires Design on the STARTUP project, not just Infrastructure -->
    <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    <PrivateAssets>all</PrivateAssets>
  </PackageReference>
</ItemGroup>

<ItemGroup>
  <ProjectReference Include="..\WidgetService.Application\WidgetService.Application.csproj" />
  <ProjectReference Include="..\WidgetService.Infrastructure\WidgetService.Infrastructure.csproj" />
  <ProjectReference Include="..\..\..\shared\Admin.Identity.Client\Admin.Identity.Client.csproj" />
  <ProjectReference Include="..\..\..\ServiceDefaults\ServiceDefaults.csproj" />
</ItemGroup>
```

### csproj ItemGroups (Tests project)

```xml
<ItemGroup>
  <PackageReference Include="AwesomeAssertions" Version="9.4.0" />
  <PackageReference Include="coverlet.msbuild" Version="6.0.4" />
  <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.14.1" />
  <PackageReference Include="NSubstitute" Version="5.3.0" />
  <PackageReference Include="xunit" Version="2.9.3" />
  <PackageReference Include="xunit.runner.visualstudio" Version="3.1.4" />
</ItemGroup>

<ItemGroup>
  <Using Include="Xunit" />
  <Using Include="AwesomeAssertions" />
  <Using Include="NSubstitute" />
</ItemGroup>

<ItemGroup>
  <ProjectReference Include="..\WidgetService.Application\WidgetService.Application.csproj" />
  <ProjectReference Include="..\WidgetService.Domain\WidgetService.Domain.csproj" />
</ItemGroup>
<!-- 80% coverage gate applies automatically via backend/Directory.Build.props/.targets -->
```

If a version pin above looks stale by the time you use it, `dotnet add
package <Name>` without `--version` picks up the current latest — don't
hand-copy an outdated number just to match this file exactly.
