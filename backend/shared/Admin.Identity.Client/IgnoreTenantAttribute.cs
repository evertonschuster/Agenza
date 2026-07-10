namespace Admin.Identity.Client;

/// <summary>
/// Opts a controller/action out of TenantHeaderFilter's default
/// requirement that every request carry an X-Tenant-Id header matching
/// the principal's tenant_id claim - for endpoints that aren't scoped to
/// a single tenant (M2M provisioning, OIDC protocol endpoints).
/// </summary>
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class IgnoreTenantAttribute : Attribute
{
}
