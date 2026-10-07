using Admin.Identity.Client;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Persistence.Interceptors;

namespace ServicesService.PersistenceTests;

internal static class PersistenceContext
{
    public static ServicesDataContext Create(string databaseName, Guid tenantId)
    {
        var tenantProvider = Substitute.For<ICurrentTenantProvider>();
        tenantProvider.TryGetTenantId(out Arg.Any<Guid>()).Returns(callInfo =>
        {
            callInfo[0] = tenantId;
            return true;
        });
        tenantProvider.TenantId.Returns(tenantId);

        var currentUserAccessor = Substitute.For<ICurrentUserAccessor>();
        currentUserAccessor.UserId.Returns((Guid?)Guid.NewGuid());
        var interceptor = new AuditableEntitySaveChangesInterceptor(currentUserAccessor, tenantProvider, TimeProvider.System);

        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(databaseName)
            .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking)
            .AddInterceptors(interceptor)
            .Options;

        return new ServicesDataContext(options, tenantProvider);
    }
}
