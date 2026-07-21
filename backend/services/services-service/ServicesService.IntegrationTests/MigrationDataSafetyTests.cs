using DotNet.Testcontainers.Builders;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using ServicesService.Application.Abstractions;
using ServicesService.Infrastructure.Persistence;
using Testcontainers.PostgreSql;

namespace ServicesService.IntegrationTests;

// Proves the data-safety guard added to
// AddCaseInsensitiveUniquenessAndCategoryLimits fails loudly instead of
// silently truncating/rejecting rows when existing data already exceeds the
// new 60/80 character limits.
public class MigrationDataSafetyTests : IAsyncLifetime
{
    private const string MigrationBeforeTheGuard = "20260720235529_AddCategoryForeignKeyToService";

    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .WithWaitStrategy(Wait.ForUnixContainer().UntilCommandIsCompleted("pg_isready"))
        .Build();

    public Task InitializeAsync() => _postgres.StartAsync();

    public Task DisposeAsync() => _postgres.DisposeAsync().AsTask();

    private class NoTenantProvider : ICurrentTenantProvider
    {
        public Guid TenantId => Guid.Empty;

        public bool TryGetTenantId(out Guid tenantId)
        {
            tenantId = Guid.Empty;
            return false;
        }
    }

    private ServicesDataContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;
        return new ServicesDataContext(options, new NoTenantProvider());
    }

    [Fact]
    public async Task Migrating_with_a_category_name_over_the_new_60_char_limit_fails_loudly_instead_of_silently_altering_it()
    {
        await using var context = CreateContext();
        var migrator = context.GetInfrastructure().GetRequiredService<IMigrator>();
        await migrator.MigrateAsync(MigrationBeforeTheGuard);

        await InsertOversizedRowAsync("Categories", new string('x', 61));

        var act = () => migrator.MigrateAsync();

        var exception = await act.Should().ThrowAsync<Exception>();
        exception.Which.ToString().Should().Contain("Cannot shrink Categories.Name");
    }

    [Fact]
    public async Task Migrating_with_a_service_name_over_the_new_80_char_limit_fails_loudly_instead_of_silently_altering_it()
    {
        await using var context = CreateContext();
        var migrator = context.GetInfrastructure().GetRequiredService<IMigrator>();
        await migrator.MigrateAsync(MigrationBeforeTheGuard);

        await InsertOversizedServiceRowAsync(new string('x', 81));

        var act = () => migrator.MigrateAsync();

        var exception = await act.Should().ThrowAsync<Exception>();
        exception.Which.ToString().Should().Contain("Cannot shrink Services.Name");
    }

    private async Task InsertOversizedRowAsync(string table, string oversizedName)
    {
        await using var connection = new NpgsqlConnection(_postgres.GetConnectionString());
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText =
            $"INSERT INTO \"services\".\"{table}\" (\"Id\", \"TenantId\", \"Name\", \"CreatedAt\") " +
            "VALUES (gen_random_uuid(), gen_random_uuid(), @name, now());";
        command.Parameters.AddWithValue("name", oversizedName);
        await command.ExecuteNonQueryAsync();
    }

    private async Task InsertOversizedServiceRowAsync(string oversizedName)
    {
        await using var connection = new NpgsqlConnection(_postgres.GetConnectionString());
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText =
            "INSERT INTO \"services\".\"Services\" " +
            "(\"Id\", \"TenantId\", \"Code\", \"Name\", \"DurationMinutes\", \"MinDurationMinutes\", " +
            "\"MaxDurationMinutes\", \"Price\", \"MaxDiscountPercentage\", \"CreatedAt\") " +
            "VALUES (gen_random_uuid(), gen_random_uuid(), 1, @name, 30, 15, 60, 10.00, 10.00, now());";
        command.Parameters.AddWithValue("name", oversizedName);
        await command.ExecuteNonQueryAsync();
    }
}
