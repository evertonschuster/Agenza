using FluentValidation;

namespace ServicesService.Application.Services.ReactivateService;

public sealed class ReactivateServiceCommandValidator : AbstractValidator<ReactivateServiceCommand>
{
    public ReactivateServiceCommandValidator()
    {
        RuleFor(command => command.ServiceId)
            .NotEmpty()
            .WithErrorCode("Service.IdRequired")
            .WithMessage("O id do serviço é obrigatório.");
    }
}
