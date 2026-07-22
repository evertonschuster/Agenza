namespace ServicesService.Infrastructure.Persistence;

// Infrastructure-only counter backing IServiceCodeGenerator - not a Domain
// aggregate, so it doesn't inherit BaseEntity/TenantOwnedEntity and isn't
// covered by the soft-delete/tenant query-filter conventions.
public class TenantSequence
{
    public Guid TenantId { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public int LastValue { get; set; }
}
