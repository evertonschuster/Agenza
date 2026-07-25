using Admin.Identity.Client;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Persistence.Interceptors;

namespace ServicesService.PersistenceTests;

public class AuditableEntitySaveChangesInterceptorTests
{
    private static ServicesDataContext CreateContext(string databaseName, ICurrentTenantProvider currentTenantProvider)
    {
        var currentUserAccessor = Substitute.For<ICurrentUserAccessor>();
        currentUserAccessor.UserId.Returns((Guid?)Guid.NewGuid());
        var interceptor = new AuditableEntitySaveChangesInterceptor(
            currentUserAccessor, currentTenantProvider, TimeProvider.System);

        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(databaseName)
            .AddInterceptors(interceptor)
            .Options;

        return new ServicesDataContext(options, currentTenantProvider);
    }

    private static ICurrentTenantProvider TenantProvider(Guid tenantId)
    {
        var provider = Substitute.For<ICurrentTenantProvider>();
        provider.TryGetTenantId(out Arg.Any<Guid>()).Returns(callInfo =>
        {
            callInfo[0] = tenantId;
            return true;
        });
        provider.TenantId.Returns(tenantId);
        return provider;
    }

    private static Service ValidService() =>
        Service.Create(
            Guid.NewGuid(), "Haircut", null, DurationRange.Create(15, 30, 60).Value, 45.50m, 10m, null, 1).Value;

    [Fact]
    public async Task SaveChangesAsync_WithNewTenantOwnedEntity_AssignsTheCurrentTenant()
    {
        var tenantId = Guid.NewGuid();
        await using var context = CreateContext(Guid.NewGuid().ToString(), TenantProvider(tenantId));
        var service = ValidService();

        context.Services.Add(service);
        await context.SaveChangesAsync();

        service.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public async Task SaveChangesAsync_WithNoTenantAvailable_ThrowsAndDoesNotPersist()
    {
        var provider = Substitute.For<ICurrentTenantProvider>();
        provider.TryGetTenantId(out Arg.Any<Guid>()).Returns(false);
        await using var context = CreateContext(Guid.NewGuid().ToString(), provider);
        context.Services.Add(ValidService());

        var act = async () => await context.SaveChangesAsync();

        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task SaveChangesAsync_WithNewEntity_StampsCreatedAtAndCreatedBy()
    {
        await using var context = CreateContext(Guid.NewGuid().ToString(), TenantProvider(Guid.NewGuid()));
        var service = ValidService();

        context.Services.Add(service);
        await context.SaveChangesAsync();

        service.CreatedAt.Should().NotBe(default);
        service.CreatedBy.Should().NotBeNull();
    }

    [Fact]
    public async Task Remove_ThenSaveChangesAsync_SoftDeletesInsteadOfRemovingTheRow()
    {
        var tenantId = Guid.NewGuid();
        var databaseName = Guid.NewGuid().ToString();
        var service = ValidService();

        await using (var context = CreateContext(databaseName, TenantProvider(tenantId)))
        {
            context.Services.Add(service);
            await context.SaveChangesAsync();
        }

        await using (var context = CreateContext(databaseName, TenantProvider(tenantId)))
        {
            var tracked = await context.Services.SingleAsync(s => s.Id == service.Id);
            context.Services.Remove(tracked);
            await context.SaveChangesAsync();
        }

        await using (var context = CreateContext(databaseName, TenantProvider(tenantId)))
        {
            (await context.Services.IgnoreQueryFilters().SingleAsync(s => s.Id == service.Id)).IsDeleted.Should().BeTrue();
            (await context.Services.AnyAsync(s => s.Id == service.Id)).Should().BeFalse();
        }
    }
}
