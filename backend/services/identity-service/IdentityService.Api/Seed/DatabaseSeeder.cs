using Admin.SharedKernel;
using IdentityService.Application.Tenants.ProvisionTenant;
using IdentityService.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using OpenIddict.Abstractions;
using IdentityService.Api.Setup;

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
        var options = _configuration.GetSection(OAuthProvisioningOptions.SectionName).Get<OAuthProvisioningOptions>()
            ?? new OAuthProvisioningOptions();
        options.Clients = ClientDefinitions(services.GetRequiredService<IHostEnvironment>().IsDevelopment());
        var errors = options.Validate(_configuration);
        if (errors.Count > 0)
        {
            throw new InvalidOperationException(string.Join(Environment.NewLine, errors));
        }

        var scopeManager = services.GetRequiredService<IOpenIddictScopeManager>();
        foreach (var definition in options.Scopes)
        {
            var descriptor = new OpenIddictScopeDescriptor { Name = definition.Name, DisplayName = definition.DisplayName };
            descriptor.Resources.UnionWith(definition.Resources);
            var scope = await scopeManager.FindByNameAsync(definition.Name, cancellationToken);
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
        foreach (var definition in options.Clients)
        {
            var descriptor = definition.ToDescriptor(_configuration);
            var application = await applicationManager.FindByClientIdAsync(definition.ClientId, cancellationToken);
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

    private static List<OAuthClientDefinition> ClientDefinitions(bool isDevelopment) =>
    [
        new()
        {
            ClientId = "admin-panel",
            DisplayName = "Painel administrativo",
            ClientType = "public",
            ApplicationType = "web",
            ConsentType = "implicit",
            GrantTypes = ["authorization_code", "refresh_token"],
            Scopes = ["openid", "profile", "email", "offline_access", "tenant_id", "services-api"],
            Resources = ["services-api"],
            RedirectUris = ["http://localhost:5173/callback", "http://localhost:5080/api-docs/", "http://localhost:5081/api-docs/"],
            PostLogoutRedirectUris = ["http://localhost:5173/login"],
        },
        new()
        {
            ClientId = "agenza-mcp",
            AllowAnyLoopbackRedirectPath = isDevelopment,
            DisplayName = "Agenza MCP",
            ClientType = "public",
            ApplicationType = "native",
            // TODO(security): consider an explicit consent screen for agenza-mcp. This public native client is
            // authorized silently (implicit consent) and, in Development, accepts any loopback path, so a local
            // process that knows the client_id and brings its own PKCE pair can obtain a user+tenant token with
            // mcp:connect while the user has a session at the authority. A consent screen (or prompt=login) would
            // need: ConsentType "explicit" here, OAuthProvisioningOptions.Validate allowing it for authorization_code
            // clients, and AuthorizationController/OAuthGrantPolicy dropping requireAutomaticConsent for this client.
            ConsentType = "implicit",
            GrantTypes = ["authorization_code", "refresh_token"],
            Scopes = ["openid", "profile", "tenant_id", "mcp:connect", "offline_access"],
            Resources = ["https://localhost:7091/mcp"],
            RedirectUris = ["http://127.0.0.1/callback/w0rLwdQGb9n5", "http://127.0.0.1/oauth/callback", "http://127.0.0.1/", "https://vscode.dev/redirect"],
        },
        new()
        {
            ClientId = "assistant-service-worker",
            DisplayName = "Serviço de assistente",
            ClientType = "confidential",
            GrantTypes = ["client_credentials"],
            Scopes = ["services-api"],
            Resources = ["services-api"],
            SecretConfigurationKey = "OAuthClientSecrets:assistant-service-worker",
        },
    ];

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
