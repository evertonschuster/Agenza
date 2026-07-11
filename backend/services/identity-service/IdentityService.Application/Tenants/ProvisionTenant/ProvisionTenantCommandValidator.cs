using FluentValidation;

namespace IdentityService.Application.Tenants.ProvisionTenant;

public sealed class ProvisionTenantCommandValidator : AbstractValidator<ProvisionTenantCommand>
{
    public ProvisionTenantCommandValidator()
    {
        RuleFor(command => command.TenantName).NotEmpty().WithMessage("O nome do tenant é obrigatório.");
        RuleFor(command => command.OwnerEmail)
            .NotEmpty().WithMessage("O e-mail do proprietário é obrigatório.")
            .EmailAddress().WithMessage("O e-mail do proprietário deve ser um endereço válido.");
        RuleFor(command => command.OwnerPassword).NotEmpty().WithMessage("A senha do proprietário é obrigatória.");
    }
}
