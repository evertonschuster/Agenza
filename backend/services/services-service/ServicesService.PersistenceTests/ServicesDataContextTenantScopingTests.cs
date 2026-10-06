using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.PersistenceTests;

public class ServicesDataContextTenantScopingTests
{
    private static ServicesDataContext CreateContext(string databaseName, Guid tenantId)
    {
        var provider = Substitute.For<ICurrentTenantProvider>();
        provider.TryGetTenantId(out Arg.Any<Guid>()).Returns(callInfo =>
        {
            callInfo[0] = tenantId;
            return true;
        });
        provider.TenantId.Returns(tenantId);

        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;

        return new ServicesDataContext(options, provider);
    }

    private static Service ValidService(string name) =>
        Service.Create(
            Guid.NewGuid(), name, null, DurationRange.Create(15, 30, 60).Value, 45.50m, 10m, null, 1).Value;

    private static async Task<Service> SaveDeletedService(string databaseName, Guid tenantId, string name)
    {
        var service = ValidService(name);
        service.AssignTenant(tenantId);
        service.MarkDeleted(null, DateTimeOffset.UtcNow);

        await using var context = CreateContext(databaseName, tenantId);
        context.Services.Add(service);
        await context.SaveChangesAsync();

        return service;
    }

    [Fact]
    public void Model_ScopesEveryTenantOwnedEntityWithNamedSoftDeleteAndTenantFilters()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var tenantOwnedTypes = context.Model.GetEntityTypes()
            .Where(entityType => typeof(ITenantOwned).IsAssignableFrom(entityType.ClrType))
            .ToList();

        tenantOwnedTypes.Should().NotBeEmpty();
        foreach (var entityType in tenantOwnedTypes)
        {
            entityType.GetDeclaredQueryFilters().Select(filter => filter.Key)
                .Should().BeEquivalentTo(new[] { "SoftDelete", "Tenant" }, entityType.DisplayName());
        }
    }

    [Fact]
    public async Task IgnoringOnlyTheSoftDeleteFilter_KeepsTheTenantScope()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var deletedOfA = await SaveDeletedService(databaseName, tenantA, "Haircut");
        await SaveDeletedService(databaseName, tenantB, "Manicure");

        await using var context = CreateContext(databaseName, tenantA);

        (await context.Services.IgnoreQueryFilters().CountAsync(TestContext.Current.CancellationToken))
            .Should().Be(2, "both rows exist, so only the tenant filter can keep tenant B's out");
        (await context.Services.AnyAsync(TestContext.Current.CancellationToken)).Should().BeFalse();
        (await context.Services.IgnoreQueryFilters(["SoftDelete"]).ToListAsync(TestContext.Current.CancellationToken))
            .Should().ContainSingle().Which.Id.Should().Be(deletedOfA.Id);
    }

    [Fact]
    public async Task Services_OnlyReturnsRowsBelongingToTheCurrentTenant()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        await using (var context = CreateContext(databaseName, tenantA))
        {
            var service = ValidService("Haircut");
            service.AssignTenant(tenantA);
            context.Services.Add(service);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, tenantB))
        {
            var service = ValidService("Manicure");
            service.AssignTenant(tenantB);
            context.Services.Add(service);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, tenantA))
        {
            var visible = await context.Services.ToListAsync(TestContext.Current.CancellationToken);

            visible.Should().ContainSingle().Which.Name.Should().Be("Haircut");
        }
    }

    [Fact]
    public async Task Services_HidesSoftDeletedRowsEvenForTheOwningTenant()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var service = ValidService("Haircut");
        service.AssignTenant(tenantId);

        await using (var context = CreateContext(databaseName, tenantId))
        {
            context.Services.Add(service);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
            var tracked = await context.Services.SingleAsync(s => s.Id == service.Id, TestContext.Current.CancellationToken);
            context.Services.Remove(tracked);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            (await context.Services.AnyAsync(s => s.Id == service.Id, TestContext.Current.CancellationToken)).Should().BeFalse();
        }
    }

    [Fact]
    public async Task NewContextForAnotherTenant_NeverSeesAPriorTenantsRow()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var service = ValidService("Haircut");
        service.AssignTenant(tenantA);

        await using (var context = CreateContext(databaseName, tenantA))
        {
            context.Services.Add(service);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        // Two DbContext instances of the SAME type, different tenants, opened
        // back to back - the scenario docs/adr/0006 calls out: a naively
        // cached compiled query filter would leak tenant A's row into tenant
        // B's context if CurrentTenantId weren't re-read off the live instance.
        await using var contextForB = CreateContext(databaseName, tenantB);

        (await contextForB.Services.AnyAsync(TestContext.Current.CancellationToken)).Should().BeFalse();
    }
}
