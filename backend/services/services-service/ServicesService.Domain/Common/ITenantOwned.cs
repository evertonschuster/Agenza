namespace ServicesService.Domain.Common;

public interface ITenantOwned
{
    Guid TenantId { get; }

    void AssignTenant(Guid tenantId);
}
