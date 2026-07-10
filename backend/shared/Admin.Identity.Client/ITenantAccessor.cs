namespace Admin.Identity.Client;

public interface ITenantAccessor
{
    // Throws if the principal has no tenant_id claim (e.g. an M2M token) - use TryGetTenantId instead for endpoints callable by both.
    Guid TenantId { get; }

    bool TryGetTenantId(out Guid tenantId);
}
