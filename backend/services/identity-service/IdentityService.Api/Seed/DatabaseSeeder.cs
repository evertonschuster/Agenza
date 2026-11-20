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
