using ServicesService.Domain.Exceptions;

namespace ServicesService.Domain.Common;

/// <summary>
/// BaseEntity + ITenantOwned combined - the shape every tenant-scoped
/// aggregate root in this service inherits instead of implementing
/// ITenantOwned itself (docs/adr/0008, docs/adr/0009). TenantId and the
/// AssignTenant guard live here once; a missing tenant always raises the
/// same InvalidTenantException regardless of which entity - it's a
/// scoping bug, not an entity-specific invariant, so one shared 400
/// response is enough.
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
            throw new InvalidTenantException();
        }

        TenantId = tenantId;
    }
}
