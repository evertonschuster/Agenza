using FluentValidation;

namespace ServicesService.Application.Services.DeactivateService;

public sealed class DeactivateServiceCommandValidator : AbstractValidator<DeactivateServiceCommand>
{
    public DeactivateServiceCommandValidator()
    {
        RuleFor(command => command.ServiceId)
            .NotEmpty()
            .WithErrorCode("Service.IdRequired")
            .WithMessage("O id do serviço é obrigatório.");
    }
}
