using Microsoft.AspNetCore.Mvc.Testing;
using Npgsql;
using Testcontainers.PostgreSql;

namespace ServicesService.RuntimeTests;

public sealed class PostgresRuntimeFixture : IAsyncLifetime
{
    private const string IdentityPassword = "runtime-identity-password";
    private const string ServicesPassword = "runtime-services-password";

    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16")
        .WithDatabase("appdb")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .WithCleanUp(true)
        .Build();

    internal ServicesApiFactory Factory { get; private set; } = null!;

    internal string AdminConnectionString => _postgres.GetConnectionString();

    internal string IdentityConnectionString =>
        BuildRoleConnectionString("identity_app", IdentityPassword);

    internal string ServicesConnectionString =>
        BuildRoleConnectionString("services_app", ServicesPassword);

    public async Task InitializeAsync()
    {
        try
        {
            await _postgres.StartAsync();
            await CreateServiceRolesAsync();

            Factory = new ServicesApiFactory(ServicesConnectionString);
            using var client = Factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                BaseAddress = new Uri("https://localhost"),
            });

            // Starting the host applies the complete migration chain.
            await client.GetAsync("/api/v1/categories");
        }
        catch (Exception exception)
        {
            var logs = await _postgres.GetLogsAsync();
            throw new InvalidOperationException(
                $"PostgreSQL runtime fixture failed.\nSTDOUT:\n{logs.Stdout}\nSTDERR:\n{logs.Stderr}",
                exception);
        }
    }

    public async Task DisposeAsync()
    {
        Factory?.Dispose();
        await _postgres.DisposeAsync();
    }

    private string BuildRoleConnectionString(string username, string password)
    {
        var builder = new NpgsqlConnectionStringBuilder(AdminConnectionString)
        {
            Username = username,
            Password = password,
        };

        return builder.ConnectionString;
    }

    private async Task CreateServiceRolesAsync()
    {
        await using var connection = new NpgsqlConnection(AdminConnectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText =
            $"""
             CREATE ROLE identity_app LOGIN PASSWORD '{IdentityPassword}'
               NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
             CREATE ROLE services_app LOGIN PASSWORD '{ServicesPassword}'
               NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

             REVOKE CREATE ON DATABASE appdb FROM PUBLIC;
             GRANT CONNECT ON DATABASE appdb TO identity_app, services_app;

             CREATE SCHEMA identity AUTHORIZATION identity_app;
             REVOKE ALL ON SCHEMA identity FROM PUBLIC, services_app;

             CREATE SCHEMA services AUTHORIZATION services_app;
             REVOKE ALL ON SCHEMA services FROM PUBLIC, identity_app;
             """;

        await command.ExecuteNonQueryAsync();
    }
}

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class PostgresRuntimeCollection : ICollectionFixture<PostgresRuntimeFixture>
{
    public const string Name = "services-service runtime";
}
