using Admin.SharedKernel;
using IdentityService.Application.Tenants.ProvisionTenant;
using IdentityService.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Abstractions;

namespace IdentityService.Api.Seed;

// Dev-time bootstrap: migrates, then idempotently seeds OpenIddict clients/scopes and a demo Tenant+owner. Safe to run on every startup.
public class DatabaseSeeder : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatabaseSeeder> _logger;

    public DatabaseSeeder(IServiceProvider serviceProvider, IConfiguration configuration, ILogger<DatabaseSeeder> logger)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var services = scope.ServiceProvider;

        var dbContext = services.GetRequiredService<IdentityDataContext>();

        // Defaults to true for local-dev/single-instance convenience. Multiple
        // replicas starting concurrently would race to apply the same
        // migration - set Migrations:RunOnStartup=false and run migrations as
        // a separate deployment step once a real multi-replica topology
        // exists (see docs/MONOREPO.md's "Known gaps"). Seeding still runs
        // either way - it assumes the schema is already migrated.
        if (_configuration.GetValue("Migrations:RunOnStartup", true))
        {
            await dbContext.Database.MigrateAsync(cancellationToken);
        }

        await SeedScopesAsync(services, cancellationToken);
        await SeedClientsAsync(services, cancellationToken);
        await SeedDemoTenantAsync(services, cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private static async Task SeedScopesAsync(IServiceProvider services, CancellationToken cancellationToken)
    {
        var scopeManager = services.GetRequiredService<IOpenIddictScopeManager>();

        if (await scopeManager.FindByNameAsync("tenant_id", cancellationToken) is null)
        {
            await scopeManager.CreateAsync(new OpenIddictScopeDescriptor
            {
                Name = "tenant_id",
                DisplayName = "Tenant",
            }, cancellationToken);
        }

        if (await scopeManager.FindByNameAsync("services-api", cancellationToken) is null)
        {
            await scopeManager.CreateAsync(new OpenIddictScopeDescriptor
            {
                Name = "services-api",
                DisplayName = "Backend services API",
                Resources = { "services-api" },
            }, cancellationToken);
        }

        if (await scopeManager.FindByNameAsync("identity-admin", cancellationToken) is null)
        {
            await scopeManager.CreateAsync(new OpenIddictScopeDescriptor
            {
                Name = "identity-admin",
                DisplayName = "Identity service internal administration",
                Resources = { "identity-service" },
            }, cancellationToken);
        }
    }

    private async Task SeedClientsAsync(IServiceProvider services, CancellationToken cancellationToken)
    {
        var applicationManager = services.GetRequiredService<IOpenIddictApplicationManager>();

        if (await applicationManager.FindByClientIdAsync("admin-panel", cancellationToken) is null)
        {
            await applicationManager.CreateAsync(new OpenIddictApplicationDescriptor
            {
                ClientId = "admin-panel",
                DisplayName = "Admin Panel SPA",
                ClientType = OpenIddictConstants.ClientTypes.Public,
                ConsentType = OpenIddictConstants.ConsentTypes.Implicit,
                RedirectUris = { new Uri("http://localhost:5173/callback") },
                PostLogoutRedirectUris = { new Uri("http://localhost:5173/login") },
                Permissions =
                {
                    OpenIddictConstants.Permissions.Endpoints.Authorization,
                    OpenIddictConstants.Permissions.Endpoints.Token,
                    OpenIddictConstants.Permissions.Endpoints.EndSession,
                    OpenIddictConstants.Permissions.GrantTypes.AuthorizationCode,
                    OpenIddictConstants.Permissions.GrantTypes.RefreshToken,
                    OpenIddictConstants.Permissions.ResponseTypes.Code,
                    OpenIddictConstants.Permissions.Scopes.Profile,
                    OpenIddictConstants.Permissions.Scopes.Email,
                    OpenIddictConstants.Permissions.Prefixes.Scope + "tenant_id",
                    OpenIddictConstants.Permissions.Prefixes.Scope + "services-api",
                    OpenIddictConstants.Permissions.Prefixes.Scope + OpenIddictConstants.Scopes.OfflineAccess,
                },
                Requirements =
                {
                    OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange,
                },
            }, cancellationToken);
        }

        if (await applicationManager.FindByClientIdAsync("assistant-service-worker", cancellationToken) is null)
        {
            var workerSecret = _configuration["IdentityClients:AssistantServiceWorker:Secret"]
                ?? throw new InvalidOperationException(
                    "Missing 'IdentityClients:AssistantServiceWorker:Secret' configuration.");

            await applicationManager.CreateAsync(new OpenIddictApplicationDescriptor
            {
                ClientId = "assistant-service-worker",
                ClientSecret = workerSecret,
                DisplayName = "Assistant Service (AI worker, M2M)",
                Permissions =
                {
                    OpenIddictConstants.Permissions.Endpoints.Token,
                    OpenIddictConstants.Permissions.GrantTypes.ClientCredentials,
                    OpenIddictConstants.Permissions.Prefixes.Scope + "services-api",
                },
            }, cancellationToken);
        }

        if (await applicationManager.FindByClientIdAsync("tenant-provisioning-cli", cancellationToken) is null)
        {
            var provisioningSecret = _configuration["IdentityClients:TenantProvisioning:Secret"]
                ?? throw new InvalidOperationException(
                    "Missing 'IdentityClients:TenantProvisioning:Secret' configuration.");

            await applicationManager.CreateAsync(new OpenIddictApplicationDescriptor
            {
                ClientId = "tenant-provisioning-cli",
                ClientSecret = provisioningSecret,
                DisplayName = "Tenant Provisioning (ops M2M)",
                Permissions =
                {
                    OpenIddictConstants.Permissions.Endpoints.Token,
                    OpenIddictConstants.Permissions.GrantTypes.ClientCredentials,
                    OpenIddictConstants.Permissions.Prefixes.Scope + "identity-admin",
                },
            }, cancellationToken);
        }
    }

    private async Task SeedDemoTenantAsync(IServiceProvider services, CancellationToken cancellationToken)
    {
        var dbContext = services.GetRequiredService<IdentityDataContext>();
        if (await dbContext.Tenants.AnyAsync(cancellationToken))
        {
            return;
        }

        // Opt-in via config - no demo credentials are seeded unless explicitly configured.
        var demoTenantName = _configuration["DemoTenant:Name"];
        var demoOwnerEmail = _configuration["DemoTenant:OwnerEmail"];
        var demoOwnerPassword = _configuration["DemoTenant:OwnerPassword"];

        if (string.IsNullOrEmpty(demoTenantName)
            || string.IsNullOrEmpty(demoOwnerEmail)
            || string.IsNullOrEmpty(demoOwnerPassword))
        {
            return;
        }

        var dispatcher = services.GetRequiredService<IDispatcher>();
        var result = await dispatcher.Send(
            new ProvisionTenantCommand(demoTenantName, demoOwnerEmail, demoOwnerPassword),
            cancellationToken);

        if (result.IsFailure)
        {
            _logger.LogWarning(
                "Demo tenant seeding failed: {ErrorCode} {ErrorMessage}",
                result.Error.Code,
                result.Error.Message);
        }
    }
}
