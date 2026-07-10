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
        optionsBuilder.UseNpgsql(connectionString);

        return new ServicesDataContext(optionsBuilder.Options);
    }
}
