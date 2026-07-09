using FluentValidation;

namespace IdentityService.Application.Tenants.ProvisionTenant;

public sealed class ProvisionTenantCommandValidator : AbstractValidator<ProvisionTenantCommand>
{
    public ProvisionTenantCommandValidator()
    {
        RuleFor(command => command.TenantName).NotEmpty();
        RuleFor(command => command.OwnerEmail).NotEmpty().EmailAddress();
        RuleFor(command => command.OwnerPassword).NotEmpty();
    }
}
