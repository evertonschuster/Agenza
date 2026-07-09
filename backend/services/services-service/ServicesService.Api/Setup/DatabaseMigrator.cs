using Microsoft.EntityFrameworkCore;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Api.Setup;

/// <summary>
/// Applies pending EF Core migrations on startup - the same dev-time
/// bootstrap approach as identity-service's DatabaseSeeder (which also
/// migrates before seeding). This service has nothing to seed, so it
/// only migrates.
/// </summary>
public class DatabaseMigrator : IHostedService
{
    private readonly IServiceProvider _serviceProvider;

    public DatabaseMigrator(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ServicesDataContext>();
        await dbContext.Database.MigrateAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
