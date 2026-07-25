using System.Data;
using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.RuntimeTests;

[Collection(PostgresRuntimeCollection.Name)]
public sealed class DatabaseBoundaryTests(PostgresRuntimeFixture fixture)
{
    [Fact]
    public async Task CompleteMigrationChain_IsAppliedFromAnEmptyDatabase()
    {
        await using var connection = new NpgsqlConnection(fixture.ServicesConnectionString);
        await connection.OpenAsync();

        await using var command = connection.CreateCommand();
        command.CommandText =
            """
            SELECT "MigrationId"
            FROM services."__EFMigrationsHistory"
            ORDER BY "MigrationId" DESC
            LIMIT 1;
            """;

        var latestMigration = (string?)await command.ExecuteScalarAsync();

        latestMigration.Should().EndWith("_EnforceTenantScopedRelationships");
    }

    [Fact]
    public async Task ServiceRole_CannotUseIdentitySchema()
    {
        await using var servicesConnection = new NpgsqlConnection(fixture.ServicesConnectionString);
        await servicesConnection.OpenAsync();

        await using var servicesCommand = servicesConnection.CreateCommand();
        servicesCommand.CommandText =
            """
            SELECT has_schema_privilege(current_user, 'services', 'USAGE'),
                   has_schema_privilege(current_user, 'identity', 'USAGE');
            """;

        await using var reader = await servicesCommand.ExecuteReaderAsync();
        (await reader.ReadAsync()).Should().BeTrue();
        reader.GetBoolean(0).Should().BeTrue();
        reader.GetBoolean(1).Should().BeFalse();

        await using var identityConnection = new NpgsqlConnection(fixture.IdentityConnectionString);
        await identityConnection.OpenAsync();
        await using var identityCommand = identityConnection.CreateCommand();
        identityCommand.CommandText =
            """
            SELECT has_schema_privilege(current_user, 'identity', 'USAGE'),
                   has_schema_privilege(current_user, 'services', 'USAGE');
            """;

        await using var identityReader = await identityCommand.ExecuteReaderAsync();
        (await identityReader.ReadAsync()).Should().BeTrue();
        identityReader.GetBoolean(0).Should().BeTrue();
        identityReader.GetBoolean(1).Should().BeFalse();
    }

    [Fact]
    public async Task DatabaseBootstrapLock_SerializesConcurrentReplicas()
    {
        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseNpgsql(fixture.ServicesConnectionString)
            .Options;
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
        await using var firstContext = new ServicesDataContext(options);
        await using var secondContext = new ServicesDataContext(options);

        await using var firstLock = await PostgresAdvisoryLock.AcquireAsync(
            firstContext,
            "runtime-test:bootstrap",
            timeout.Token);
        var secondLockTask = PostgresAdvisoryLock.AcquireAsync(
            secondContext,
            "runtime-test:bootstrap",
            timeout.Token);

        for (var attempt = 0; attempt < 20; attempt++)
        {
            if (secondContext.Database.GetDbConnection().State == ConnectionState.Open)
            {
                break;
            }

            await Task.Delay(50, timeout.Token);
        }

        secondContext.Database.GetDbConnection().State.Should().Be(ConnectionState.Open);
        secondLockTask.IsCompleted.Should().BeFalse();

        await firstLock.DisposeAsync();
        await using var secondLock = await secondLockTask.WaitAsync(
            TimeSpan.FromSeconds(3),
            timeout.Token);
    }

    [Fact]
    public async Task PostgreSql_RejectsCrossTenantCategoryRelationship()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var categoryId = Guid.NewGuid();

        await using var connection = new NpgsqlConnection(fixture.ServicesConnectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText =
            """
            INSERT INTO services."Categories" ("Id", "Name", "CreatedAt", "TenantId")
            VALUES (@category_id, @category_name, now(), @tenant_b);

            INSERT INTO services."Services"
              ("Id", "Code", "Name", "DurationMinutes", "MinDurationMinutes",
               "MaxDurationMinutes", "Price", "MaxDiscountPercentage",
               "CategoryId", "CreatedAt", "TenantId")
            VALUES
              (@service_id, 1, @service_name, 30, 30, 30, 10, 0,
               @category_id, now(), @tenant_a);
            """;
        command.Parameters.AddWithValue("category_id", categoryId);
        command.Parameters.AddWithValue("category_name", $"Category {Guid.NewGuid():N}");
        command.Parameters.AddWithValue("service_id", Guid.NewGuid());
        command.Parameters.AddWithValue("service_name", $"Service {Guid.NewGuid():N}");
        command.Parameters.AddWithValue("tenant_a", tenantA);
        command.Parameters.AddWithValue("tenant_b", tenantB);

        var exception = await Assert.ThrowsAsync<PostgresException>(
            async () => await command.ExecuteNonQueryAsync());

        exception.SqlState.Should().Be(PostgresErrorCodes.ForeignKeyViolation);
        exception.ConstraintName.Should().Be("FK_Services_Categories_TenantId_CategoryId");
    }

    [Fact]
    public async Task PostgreSql_RejectsCrossTenantTagMembership()
    {
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var serviceId = Guid.NewGuid();
        var tagId = Guid.NewGuid();

        await using var connection = new NpgsqlConnection(fixture.ServicesConnectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText =
            """
            INSERT INTO services."Services"
              ("Id", "Code", "Name", "DurationMinutes", "MinDurationMinutes",
               "MaxDurationMinutes", "Price", "MaxDiscountPercentage",
               "CreatedAt", "TenantId")
            VALUES
              (@service_id, 2, @service_name, 30, 30, 30, 10, 0, now(), @tenant_a);

            INSERT INTO services."Tags"
              ("Id", "Name", "Color", "CreatedAt", "TenantId")
            VALUES
              (@tag_id, @tag_name, '#000000', now(), @tenant_b);

            INSERT INTO services."ServiceTags" ("ServiceId", "TagsId", "TenantId")
            VALUES (@service_id, @tag_id, @tenant_a);
            """;
        command.Parameters.AddWithValue("service_id", serviceId);
        command.Parameters.AddWithValue("service_name", $"Service {Guid.NewGuid():N}");
        command.Parameters.AddWithValue("tag_id", tagId);
        command.Parameters.AddWithValue("tag_name", $"Tag {Guid.NewGuid():N}");
        command.Parameters.AddWithValue("tenant_a", tenantA);
        command.Parameters.AddWithValue("tenant_b", tenantB);

        var exception = await Assert.ThrowsAsync<PostgresException>(
            async () => await command.ExecuteNonQueryAsync());

        exception.SqlState.Should().Be(PostgresErrorCodes.ForeignKeyViolation);
        exception.ConstraintName.Should().Be("FK_ServiceTags_Tags_TenantId_TagsId");
    }
}
