namespace IdentityService.Application.UseCases.ProvisionTenant;

public record ProvisionTenantRequest(string TenantName, string OwnerEmail, string OwnerPassword)
{
    // Compiler-generated records print every property in ToString() -
    // override it so the password never lands in logs/exception messages.
    public override string ToString() =>
        $"{nameof(ProvisionTenantRequest)} {{ TenantName = {TenantName}, OwnerEmail = {OwnerEmail}, OwnerPassword = [REDACTED] }}";
}
