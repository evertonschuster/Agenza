using Admin.Identity.Client;
using ServicesService.Application.Abstractions;

namespace ServicesService.Infrastructure.Security;

public class CurrentTenantProvider : ICurrentTenantProvider
{
    private readonly ITenantAccessor _tenantAccessor;

    public CurrentTenantProvider(ITenantAccessor tenantAccessor)
    {
        _tenantAccessor = tenantAccessor;
    }

    public Guid TenantId => _tenantAccessor.TenantId;

    public bool TryGetTenantId(out Guid tenantId) => _tenantAccessor.TryGetTenantId(out tenantId);
}
