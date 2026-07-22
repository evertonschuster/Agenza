namespace ServicesService.Domain.Common;

/// <summary>
/// BaseEntity + ITenantOwned combined - the shape every tenant-scoped
/// aggregate root in this service inherits instead of implementing
/// ITenantOwned itself (docs/adr/0008, docs/adr/0009). TenantId and the
/// AssignTenant guard live here once. TenantHeaderFilter already rejects
/// any request with a missing/mismatched tenant header before a handler
/// or interceptor runs, so tenantId == Guid.Empty here can only happen
/// via an internal bug, never directly from user input - a plain
/// InvalidOperationException (not a Result/DomainResult) is correct.
/// </summary>
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

    public void AssignTenant(Guid tenantId)
    {
        if (tenantId == Guid.Empty)
        {
            throw new InvalidOperationException("A tenant id is required to assign a tenant.");
        }

        TenantId = tenantId;
    }
}
