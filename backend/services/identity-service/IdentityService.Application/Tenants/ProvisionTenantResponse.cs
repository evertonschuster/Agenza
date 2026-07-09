namespace IdentityService.Application.Tenants;

public record ProvisionTenantResponse(Guid TenantId, Guid OwnerUserId);
