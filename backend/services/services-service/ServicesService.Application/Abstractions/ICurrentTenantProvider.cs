namespace ServicesService.Application.Abstractions;

public interface ICurrentTenantProvider
{
    Guid TenantId { get; }

    bool TryGetTenantId(out Guid tenantId);
}
