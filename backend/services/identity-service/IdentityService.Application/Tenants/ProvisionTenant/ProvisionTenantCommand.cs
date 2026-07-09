using Admin.SharedKernel;

namespace IdentityService.Application.Tenants.ProvisionTenant;

public sealed record ProvisionTenantCommand(string TenantName, string OwnerEmail, string OwnerPassword)
    : ICommand<ProvisionTenantResponse>
{
    // Compiler-generated records print every property in ToString() -
    // override it so the password never lands in logs/exception messages.
    public override string ToString() =>
        $"{nameof(ProvisionTenantCommand)} {{ TenantName = {TenantName}, OwnerEmail = {OwnerEmail}, OwnerPassword = [REDACTED] }}";
}
