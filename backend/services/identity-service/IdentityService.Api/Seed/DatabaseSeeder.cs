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

        await SeedOAuthAsync(services, cancellationToken);
        await SeedDemoTenantAsync(services, cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task SeedOAuthAsync(IServiceProvider services, CancellationToken cancellationToken)
    {
        var scopeManager = services.GetRequiredService<IOpenIddictScopeManager>();
        foreach (var descriptor in ScopeDefinitions())
        {
            var scope = await scopeManager.FindByNameAsync(descriptor.Name!, cancellationToken);
            if (scope is null)
            {
                await scopeManager.CreateAsync(descriptor, cancellationToken);
            }
            else
            {
                await scopeManager.UpdateAsync(scope, descriptor, cancellationToken);
            }
        }

        var applicationManager = services.GetRequiredService<IOpenIddictApplicationManager>();
        foreach (var descriptor in ClientDefinitions())
        {
            var application = await applicationManager.FindByClientIdAsync(descriptor.ClientId!, cancellationToken);
            if (application is null)
            {
                await applicationManager.CreateAsync(descriptor, cancellationToken);
            }
            else
            {
                await applicationManager.UpdateAsync(application, descriptor, cancellationToken);
            }
        }
    }

    public static void ConfigureScopes(OpenIddictServerBuilder options)
    {
        options.RegisterScopes(ScopeDefinitions().Select(scope => scope.Name!).ToArray());
        options.RegisterResources(ScopeDefinitions().SelectMany(scope => scope.Resources)
            .Where(resource => Uri.TryCreate(resource, UriKind.Absolute, out _))
            .Distinct(StringComparer.Ordinal).ToArray());
    }

    private static List<OpenIddictScopeDescriptor> ScopeDefinitions()
    {
        return
        [
            new() { Name = OpenIddictConstants.Scopes.OpenId, DisplayName = "openid" },
            new() { Name = OpenIddictConstants.Scopes.Profile, DisplayName = "profile" },
            new() { Name = OpenIddictConstants.Scopes.Email, DisplayName = "email" },
            new() { Name = OpenIddictConstants.Scopes.OfflineAccess, DisplayName = "offline_access" },
            new() { Name = "tenant_id", DisplayName = "tenant_id" },
            new()
            {
                Name = "services-api",
                DisplayName = "API de serviços",
                Resources = { "services-api" },
            },
            new()
            {
                Name = "services-mcp",
                DisplayName = "MCP de serviços",
                Resources = { "https://localhost:7091/mcp" },
            },
            new()
            {
                Name = "identity-admin",
                DisplayName = "Administração de identidade",
                Resources = { "identity-service" },
            },
        ];
    }

    private static List<OpenIddictApplicationDescriptor> ClientDefinitions()
    {
        return
        [
            new()
            {
                ClientId = "admin-panel",
                DisplayName = "Painel administrativo",
                ClientType = OpenIddictConstants.ClientTypes.Public,
                ApplicationType = OpenIddictConstants.ApplicationTypes.Web,
                ConsentType = OpenIddictConstants.ConsentTypes.Implicit,
                RedirectUris =
                {
                    new("http://localhost:5173/callback"),
                    new("http://localhost:5080/api-docs/"),
                    new("http://localhost:5081/api-docs/"),
                },
                PostLogoutRedirectUris = { new("http://localhost:5173/login") },
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
                    OpenIddictConstants.Permissions.Prefixes.Resource + "services-api",
                },
                Requirements = { OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange },
            },
            new()
            {
                ClientId = "agenza-mcp",
                DisplayName = "Agenza MCP",
                ClientType = OpenIddictConstants.ClientTypes.Public,
                ApplicationType = OpenIddictConstants.ApplicationTypes.Native,
                ConsentType = OpenIddictConstants.ConsentTypes.Implicit,
                RedirectUris =
                {
                    new("http://127.0.0.1/oauth/callback"),
                    new("http://127.0.0.1/callback"),
                    new("http://127.0.0.1/"),
                    new("http://localhost/oauth/callback"),
                    new("http://localhost/callback"),
                    new("http://localhost/"),
                    new("http://[::1]/oauth/callback"),
                    new("http://[::1]/callback"),
                    new("http://[::1]/"),
                    new("https://vscode.dev/redirect"),
                    new("https://insiders.vscode.dev/redirect"),
                    new("https://claude.ai/api/mcp/auth_callback"),
                    new("https://claude.com/api/mcp/auth_callback"),
                },
                Permissions =
                {
                    OpenIddictConstants.Permissions.Endpoints.Authorization,
                    OpenIddictConstants.Permissions.Endpoints.Token,
                    OpenIddictConstants.Permissions.GrantTypes.AuthorizationCode,
                    OpenIddictConstants.Permissions.GrantTypes.RefreshToken,
                    OpenIddictConstants.Permissions.ResponseTypes.Code,
                    OpenIddictConstants.Permissions.Scopes.Profile,
                    OpenIddictConstants.Permissions.Scopes.Email,
                    OpenIddictConstants.Permissions.Prefixes.Scope + "tenant_id",
                    OpenIddictConstants.Permissions.Prefixes.Scope + "services-mcp",
                    OpenIddictConstants.Permissions.Prefixes.Resource + "https://localhost:7091/mcp",
                },
                Requirements = { OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange },
            },
        ];
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
