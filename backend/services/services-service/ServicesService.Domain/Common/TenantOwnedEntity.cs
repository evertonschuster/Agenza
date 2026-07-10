using ServicesService.Domain.Exceptions;

namespace ServicesService.Domain.Common;

/// <summary>
/// BaseEntity + ITenantOwned combined - the shape every tenant-scoped
/// aggregate root in this service inherits instead of implementing
/// ITenantOwned itself (docs/adr/0008). TenantId and the AssignTenant
/// guard live here once; each entity only supplies the exception its
/// own invariant violation should raise, so Tag.Invalid vs
/// ServiceOffering.Invalid stay distinct in the 400 response.
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
            throw CreateTenantRequiredException();
        }

        TenantId = tenantId;
    }

    protected abstract BusinessException CreateTenantRequiredException();
}
