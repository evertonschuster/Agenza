namespace IdentityService.Application.UseCases.ProvisionTenant;

public record ProvisionTenantResult(Guid TenantId, Guid OwnerUserId);
