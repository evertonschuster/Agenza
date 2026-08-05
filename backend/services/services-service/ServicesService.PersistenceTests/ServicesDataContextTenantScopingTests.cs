using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
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
            await context.SaveChangesAsync();
        }

        await using (var context = CreateContext(databaseName, tenantB))
        {
            var service = ValidService("Manicure");
            service.AssignTenant(tenantB);
            context.Services.Add(service);
            await context.SaveChangesAsync();
        }

        await using (var context = CreateContext(databaseName, tenantA))
        {
            var visible = await context.Services.ToListAsync();

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
            await context.SaveChangesAsync();
            var tracked = await context.Services.SingleAsync(s => s.Id == service.Id);
            context.Services.Remove(tracked);
            await context.SaveChangesAsync();
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            (await context.Services.AnyAsync(s => s.Id == service.Id)).Should().BeFalse();
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
            await context.SaveChangesAsync();
        }

        // Two DbContext instances of the SAME type, different tenants, opened
        // back to back - the scenario the current architecture calls out: a naively
        // cached compiled query filter would leak tenant A's row into tenant
        // B's context if CurrentTenantId weren't re-read off the live instance.
        await using var contextForB = CreateContext(databaseName, tenantB);

        (await contextForB.Services.AnyAsync()).Should().BeFalse();
    }
}
