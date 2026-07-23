using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace ServicesService.Infrastructure.Persistence;

public class ServicesDataContextFactory : IDesignTimeDbContextFactory<ServicesDataContext>
{
    public ServicesDataContext CreateDbContext(string[] args)
    {
        var environmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";

        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environmentName}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException(
                "Missing 'ConnectionStrings:Default' configuration for design-time migrations. " +
                "Set it in ServicesService.Api/appsettings.Development.json or the " +
                "ConnectionStrings__Default environment variable.");

        var optionsBuilder = new DbContextOptionsBuilder<ServicesDataContext>();
        // Kept in sync with DependencyInjection.AddServicesInfrastructure's runtime
        // configuration (docs/adr/0017) - design-time tooling (`dotnet ef migrations
        // list`/`database update`) must resolve migrations against the same
        // schema-scoped history table the running service uses.
        optionsBuilder.UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__EFMigrationsHistory", "services"));

        return new ServicesDataContext(optionsBuilder.Options);
    }
}
