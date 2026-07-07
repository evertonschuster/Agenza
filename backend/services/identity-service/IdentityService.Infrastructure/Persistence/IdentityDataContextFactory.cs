using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace IdentityService.Infrastructure.Persistence;

/// <summary>
/// Lets `dotnet ef migrations add` build the model without spinning up the
/// full Api host. Reads the same appsettings.json / appsettings.{env}.json
/// the Api project uses (dotnet-ef runs with the startup project's
/// directory as the working directory) so the connection string - and its
/// credentials - live in one place, not hardcoded here.
/// </summary>
public class IdentityDataContextFactory : IDesignTimeDbContextFactory<IdentityDataContext>
{
    public IdentityDataContext CreateDbContext(string[] args)
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
                "Set it in IdentityService.Api/appsettings.Development.json or the " +
                "ConnectionStrings__Default environment variable.");

        var optionsBuilder = new DbContextOptionsBuilder<IdentityDataContext>();
        optionsBuilder.UseNpgsql(connectionString);

        return new IdentityDataContext(optionsBuilder.Options);
    }
}
