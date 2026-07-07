namespace Admin.Identity.Client;

public interface ITenantAccessor
{
    Guid TenantId { get; }
}
