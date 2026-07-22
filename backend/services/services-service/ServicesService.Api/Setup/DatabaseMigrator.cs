using Microsoft.EntityFrameworkCore;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Api.Setup;

public class DatabaseMigrator : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IConfiguration _configuration;

    public DatabaseMigrator(IServiceProvider serviceProvider, IConfiguration configuration)
    {
        _serviceProvider = serviceProvider;
        _configuration = configuration;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        // Defaults to true for local-dev/single-instance convenience. Multiple
        // replicas starting concurrently would race to apply the same
        // migration - set Migrations:RunOnStartup=false and run migrations as
        // a separate deployment step once a real multi-replica topology
        // exists (see docs/MONOREPO.md's "Known gaps").
        if (!_configuration.GetValue("Migrations:RunOnStartup", true))
        {
            return;
        }

        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ServicesDataContext>();
        await dbContext.Database.MigrateAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
