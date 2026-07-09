namespace Admin.Identity.Client;

public interface ITenantAccessor
{
    /// <summary>
    /// The authenticated principal's tenant. Throws for principals with no
    /// tenant_id claim (e.g. client_credentials/M2M service tokens) - use
    /// <see cref="TryGetTenantId"/> for endpoints that may be called by both
    /// tenant users and M2M workers.
    /// </summary>
    Guid TenantId { get; }

    bool TryGetTenantId(out Guid tenantId);
}
