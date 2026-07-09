using DotNet.Testcontainers.Builders;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Testcontainers.PostgreSql;

namespace IdentityService.IntegrationTests;

/// <summary>
/// Boots the real identity-service host (Program.cs, OpenIddict, EF Core
/// migrations via DatabaseSeeder) against a throwaway Postgres container.
/// One container + one host are shared by every test in a class
/// (IClassFixture) - the seeder is idempotent, so that is safe.
/// </summary>
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

        // Keep the dev-convenience demo tenant out of these tests so
        // assertions run against a deterministic, empty identity schema.
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
