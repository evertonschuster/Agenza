namespace ServicesService.Domain.Common;

public abstract class TenantOwnedEntity : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; private set; }

    protected TenantOwnedEntity()
    {
    }

    protected TenantOwnedEntity(Guid id)
        : base(id)
    {
    }

    // Throws rather than DomainResult: TenantHeaderFilter already rejects a
    // missing/mismatched tenant before this runs, so Guid.Empty here is only
    // reachable via an internal bug, not user input (docs/adr/0014).
    public void AssignTenant(Guid tenantId)
    {
        if (tenantId == Guid.Empty)
        {
            throw new InvalidOperationException("A tenant id is required to assign a tenant.");
        }

        TenantId = tenantId;
    }
}
