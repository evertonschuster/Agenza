using Admin.Identity.Client;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Persistence.Interceptors;

namespace ServicesService.IntegrationTests;

public class AuditableEntitySaveChangesInterceptorTests
{
    private class FixedTenantProvider : ICurrentTenantProvider
    {
        private readonly Guid? _tenantId;

        public FixedTenantProvider(Guid? tenantId)
        {
            _tenantId = tenantId;
        }

        public Guid TenantId => _tenantId ?? throw new InvalidOperationException("No tenant in context.");

        public bool TryGetTenantId(out Guid tenantId)
        {
            tenantId = _tenantId ?? Guid.Empty;
            return _tenantId is not null;
        }
    }

    private class NullCurrentUserAccessor : ICurrentUserAccessor
    {
        public Guid? UserId => null;
    }

    private static ServicesDataContext CreateContext(Guid? tenantId)
    {
        var tenantProvider = new FixedTenantProvider(tenantId);
        var interceptor = new AuditableEntitySaveChangesInterceptor(
            new NullCurrentUserAccessor(), tenantProvider, TimeProvider.System);
        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .AddInterceptors(interceptor)
            .Options;
        return new ServicesDataContext(options, tenantProvider);
    }

    [Fact]
    public async Task SavingANewTagWithNoTenantAssigned_GetsTheCurrentTenantAutomatically()
    {
        var tenantId = Guid.NewGuid();
        await using var context = CreateContext(tenantId);
        var tag = new Tag(Guid.CreateVersion7(), "VIP", TagColor.From("#0d9488"), null);
        context.Tags.Add(tag);

        await context.SaveChangesAsync();

        tag.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public async Task SavingANewTagWithNoTenantInContext_Throws()
    {
        await using var context = CreateContext(tenantId: null);
        context.Tags.Add(new Tag(Guid.CreateVersion7(), "VIP", TagColor.From("#0d9488"), null));

        var act = () => context.SaveChangesAsync();

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task SavingANewTagWithATenantAlreadyAssigned_KeepsIt()
    {
        var explicitTenantId = Guid.NewGuid();
        await using var context = CreateContext(Guid.NewGuid());
        var tag = new Tag(Guid.CreateVersion7(), "VIP", TagColor.From("#0d9488"), null);
        tag.AssignTenant(explicitTenantId);
        context.Tags.Add(tag);

        await context.SaveChangesAsync();

        tag.TenantId.Should().Be(explicitTenantId);
    }
}
