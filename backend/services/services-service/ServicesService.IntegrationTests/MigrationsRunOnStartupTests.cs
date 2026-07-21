using System.Net;
using System.Net.Http.Headers;
using DotNet.Testcontainers.Builders;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Testcontainers.PostgreSql;

namespace ServicesService.IntegrationTests;

// Proves Migrations:RunOnStartup=false genuinely skips DatabaseMigrator's
// migration call, not just that the flag is read - a fresh, unmigrated
// database must make every request fail instead of silently working.
public class MigrationsRunOnStartupTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .WithWaitStrategy(Wait.ForUnixContainer().UntilCommandIsCompleted("pg_isready"))
        .Build();

    public Task InitializeAsync() => _postgres.StartAsync();

    public Task DisposeAsync() => _postgres.DisposeAsync().AsTask();

    [Fact]
    public async Task When_disabled_the_database_is_never_migrated_and_requests_fail()
    {
        await using var factory = new DisabledMigrationsFactory(_postgres.GetConnectionString());
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Test", Guid.NewGuid().ToString());
        client.DefaultRequestHeaders.Add("X-Tenant-Id", client.DefaultRequestHeaders.Authorization.Parameter);

        var response = await client.GetAsync("/api/v1/tags");

        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }

    private sealed class DisabledMigrationsFactory : WebApplicationFactory<Program>
    {
        private readonly string _connectionString;

        public DisabledMigrationsFactory(string connectionString)
        {
            _connectionString = connectionString;
        }

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Development");
            builder.UseSetting("ConnectionStrings:Default", _connectionString);
            builder.UseSetting("Identity:Authority", "http://unused.invalid");
            builder.UseSetting("Migrations:RunOnStartup", "false");

            builder.ConfigureTestServices(services =>
            {
                services
                    .AddAuthentication(TestAuthHandler.SchemeName)
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            });
        }
    }
}
