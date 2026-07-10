using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.IntegrationTests;

public class ServicesDataContextTenantScopingTests
{
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

    private static ServicesDataContext CreateContext(string databaseName, Guid tenantId)
    {
        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(databaseName)
            .Options;
        return new ServicesDataContext(options, new FixedTenantProvider(tenantId));
    }

    [Fact]
    public async Task EachContextInstance_OnlySeesItsOwnTenantsRows_RegardlessOfModelBuildOrder()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        // Context A builds the DbContext model first. Context B is
        // constructed afterward, once that model is already cached for
        // the ServicesDataContext type - reproduces the scenario where a
        // baked-in tenant filter constant would leak across requests.
        await using (var contextA = CreateContext(databaseName, tenantA))
        {
            contextA.Tags.Add(new Tag(Guid.CreateVersion7(), tenantA, "A's Tag", TagColor.From("#0d9488"), null));
            await contextA.SaveChangesAsync();
        }

        await using (var contextB = CreateContext(databaseName, tenantB))
        {
            contextB.Tags.Add(new Tag(Guid.CreateVersion7(), tenantB, "B's Tag", TagColor.From("#ef4444"), null));
            await contextB.SaveChangesAsync();
        }

        await using (var readAsA = CreateContext(databaseName, tenantA))
        {
            (await readAsA.Tags.ToListAsync()).Should().ContainSingle(t => t.Name == "A's Tag");
        }

        await using (var readAsB = CreateContext(databaseName, tenantB))
        {
            (await readAsB.Tags.ToListAsync()).Should().ContainSingle(t => t.Name == "B's Tag");
        }
    }
}
