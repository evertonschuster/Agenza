using Admin.SharedKernel;
using IdentityService.Application.Tenants.ProvisionTenant;
using IdentityService.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Abstractions;

namespace IdentityService.Api.Seed;

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
        if (!_configuration.GetValue<bool>("DatabaseBootstrap:RunOnStartup"))
        {
            return;
        }

        using var scope = _serviceProvider.CreateScope();
        var services = scope.ServiceProvider;

        var dbContext = services.GetRequiredService<IdentityDataContext>();

        await dbContext.Database.MigrateAsync(cancellationToken);

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

        await EnsureAdminPanelClientAsync(applicationManager, _configuration, cancellationToken);
        await EnsureClientWorkerAsync(applicationManager, cancellationToken);
        await EnsureTenantProvisioningClientAsync(applicationManager, cancellationToken);
    }

    private static async Task EnsureAdminPanelClientAsync(
        IOpenIddictApplicationManager applicationManager,
        IConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var adminPanel = await applicationManager.FindByClientIdAsync("admin-panel", cancellationToken);
        var redirectUris = GetConfiguredUris(configuration, "IdentityClients:AdminPanel:RedirectUris");
        var postLogoutRedirectUris = GetConfiguredUris(configuration, "IdentityClients:AdminPanel:PostLogoutRedirectUris");

        var descriptor = CreateAdminPanelDescriptor();
        MergeUris(descriptor.RedirectUris, redirectUris);
        MergeUris(descriptor.PostLogoutRedirectUris, postLogoutRedirectUris);

        if (adminPanel is null)
        {
            await applicationManager.CreateAsync(descriptor, cancellationToken);
            return;
        }

        await applicationManager.PopulateAsync(adminPanel, descriptor, cancellationToken);
        MergeUris(descriptor.RedirectUris, redirectUris);
        MergeUris(descriptor.PostLogoutRedirectUris, postLogoutRedirectUris);

        await applicationManager.UpdateAsync(adminPanel, descriptor, cancellationToken);
    }

    private static OpenIddictApplicationDescriptor CreateAdminPanelDescriptor() => new()
    {
        ClientId = "admin-panel",
        DisplayName = "Admin Panel SPA",
        ClientType = OpenIddictConstants.ClientTypes.Public,
        ConsentType = OpenIddictConstants.ConsentTypes.Implicit,
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
    };

    private static IReadOnlyCollection<Uri> GetConfiguredUris(IConfiguration configuration, string path)
    {
        var values = configuration.GetSection(path).GetChildren().Select(child => child.Value).Where(value => !string.IsNullOrWhiteSpace(value)).ToArray();

        if (values.Length == 0)
        {
            throw new InvalidOperationException($"Missing '{path}' configuration.");
        }

        return values.Select(value => new Uri(value!)).ToArray();
    }

    private static void MergeUris(ICollection<Uri> target, IReadOnlyCollection<Uri> values)
    {
        foreach (var value in values)
        {
            if (target.Any(existing => string.Equals(existing.ToString(), value.ToString(), StringComparison.OrdinalIgnoreCase)))
            {
                continue;
            }

            target.Add(value);
        }
    }

    private async Task EnsureClientWorkerAsync(
        IOpenIddictApplicationManager applicationManager,
        CancellationToken cancellationToken)
    {
        if (await applicationManager.FindByClientIdAsync("assistant-service-worker", cancellationToken) is not null)
        {
            return;
        }

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

    private async Task EnsureTenantProvisioningClientAsync(
        IOpenIddictApplicationManager applicationManager,
        CancellationToken cancellationToken)
    {
        if (await applicationManager.FindByClientIdAsync("tenant-provisioning-cli", cancellationToken) is not null)
        {
            return;
        }

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
