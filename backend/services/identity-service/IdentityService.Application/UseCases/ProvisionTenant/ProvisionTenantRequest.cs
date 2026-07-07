namespace IdentityService.Application.UseCases.ProvisionTenant;

public record ProvisionTenantRequest(string TenantName, string OwnerEmail, string OwnerPassword);
