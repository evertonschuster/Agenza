using DotNet.Testcontainers.Builders;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace IdentityService.IntegrationTests;

public sealed class IdentityApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string WorkerSecret = "integration-test-worker-secret";
    public const string ProvisioningSecret = "integration-test-provisioning-secret";

    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .WithWaitStrategy(Wait.ForUnixContainer().UntilCommandIsCompleted("pg_isready"))
        .Build();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.UseSetting("ConnectionStrings:Default", _postgres.GetConnectionString());
        builder.UseSetting("IdentityClients:AssistantServiceWorker:Secret", WorkerSecret);
        builder.UseSetting("IdentityClients:TenantProvisioning:Secret", ProvisioningSecret);

        // Blank demo-tenant config keeps the seeded demo tenant out of these tests.
        builder.UseSetting("DemoTenant:Name", "");
        builder.UseSetting("DemoTenant:OwnerEmail", "");
        builder.UseSetting("DemoTenant:OwnerPassword", "");
    }

    Task IAsyncLifetime.InitializeAsync() => _postgres.StartAsync();

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }
}
