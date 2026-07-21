using DotNet.Testcontainers.Builders;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Infrastructure.Persistence;
using Testcontainers.PostgreSql;

namespace ServicesService.IntegrationTests;

// Exercises UnitOfWork.SaveChangesAsync against a real Postgres, not the EF
// InMemory provider - the DbUpdateException/PostgresException translation it
// performs only fires against a real unique-constraint violation (SQLSTATE
// 23505), which InMemory never raises.
public class UnitOfWorkTests : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .WithWaitStrategy(Wait.ForUnixContainer().UntilCommandIsCompleted("pg_isready"))
        .Build();

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();
        await using var context = CreateContext();
        await context.Database.MigrateAsync();
    }

    public Task DisposeAsync() => _postgres.DisposeAsync().AsTask();

    private class FixedTenantProvider : ICurrentTenantProvider
    {
        private readonly Guid _tenantId;

        public FixedTenantProvider(Guid tenantId)
        {
            _tenantId = tenantId;
        }

        public Guid TenantId => _tenantId;

        public bool TryGetTenantId(out Guid tenantId)
        {
            tenantId = _tenantId;
            return true;
        }
    }

    private ServicesDataContext CreateContext(Guid? tenantId = null)
    {
        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseNpgsql(_postgres.GetConnectionString())
            .Options;
        return new ServicesDataContext(options, new FixedTenantProvider(tenantId ?? Guid.NewGuid()));
    }

    [Fact]
    public async Task SaveChangesAsync_WithNoConflict_ReturnsSuccess()
    {
        await using var context = CreateContext();
        var category = Category.Create(Guid.CreateVersion7(), "Hair").Value;
        category.AssignTenant(Guid.NewGuid());
        context.Categories.Add(category);
        var unitOfWork = new UnitOfWork(context);

        var result = await unitOfWork.SaveChangesAsync(CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be(1);
    }

    [Fact]
    public async Task SaveChangesAsync_WithConcurrentDuplicateName_ReturnsUniqueConstraintFailure()
    {
        var tenantId = Guid.NewGuid();
        await using var context = CreateContext(tenantId);
        var existing = Category.Create(Guid.CreateVersion7(), "Hair").Value;
        existing.AssignTenant(tenantId);
        context.Categories.Add(existing);
        await context.SaveChangesAsync();

        await using var raceContext = CreateContext(tenantId);
        var conflicting = Category.Create(Guid.CreateVersion7(), "Hair").Value;
        conflicting.AssignTenant(tenantId);
        raceContext.Categories.Add(conflicting);
        var unitOfWork = new UnitOfWork(raceContext);

        var result = await unitOfWork.SaveChangesAsync(CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Kind.Should().Be(PersistenceErrorKind.UniqueConstraintViolation);
        result.Error.ConstraintName.Should().Be("IX_Categories_TenantId_NameNormalized");
    }

    [Fact]
    public async Task SaveChangesAsync_WithAnUnrecognizedDatabaseError_StillThrows()
    {
        await using var context = CreateContext();
        var service = Service.Create(
            Guid.CreateVersion7(), "Haircut", null, 30, 15, 60, 45.50m, 10m, Guid.NewGuid(), 1).Value;
        service.AssignTenant(Guid.NewGuid());
        context.Services.Add(service);
        var unitOfWork = new UnitOfWork(context);

        var act = () => unitOfWork.SaveChangesAsync(CancellationToken.None);

        // A foreign-key violation (the referenced Category doesn't exist) is not a
        // unique-constraint violation - IsUniqueViolation doesn't match it, so it
        // propagates unhandled instead of becoming a PersistenceResult.Failure.
        await act.Should().ThrowAsync<DbUpdateException>();
    }

    [Fact]
    public async Task SaveChangesAsync_WhenCancelled_PropagatesCancellation()
    {
        await using var context = CreateContext();
        var category = Category.Create(Guid.CreateVersion7(), "Hair").Value;
        category.AssignTenant(Guid.NewGuid());
        context.Categories.Add(category);
        var unitOfWork = new UnitOfWork(context);
        using var cts = new CancellationTokenSource();
        await cts.CancelAsync();

        var act = () => unitOfWork.SaveChangesAsync(cts.Token);

        await act.Should().ThrowAsync<OperationCanceledException>();
    }
}
