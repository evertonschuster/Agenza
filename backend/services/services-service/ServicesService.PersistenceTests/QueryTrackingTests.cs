using Admin.Identity.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ServicesService.Infrastructure;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.PersistenceTests;

public class QueryTrackingTests
{
    [Fact]
    public void AddServicesInfrastructure_ConfiguresNoTrackingByDefault()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Default"] = "Host=localhost;Database=services;Username=postgres;Password=postgres",
            })
            .Build();
        var tenantAccessor = Substitute.For<ITenantAccessor>();
        var currentUserAccessor = Substitute.For<ICurrentUserAccessor>();
        var services = new ServiceCollection();
        services.AddSingleton(tenantAccessor);
        services.AddSingleton(currentUserAccessor);
        services.AddServicesInfrastructure(configuration);

        using var provider = services.BuildServiceProvider();
        using var scope = provider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ServicesDataContext>();

        context.ChangeTracker.QueryTrackingBehavior.Should().Be(QueryTrackingBehavior.NoTracking);
    }
}
