using FluentValidation;

namespace ServicesService.Application.Services.DeleteService;

public sealed class DeleteServiceCommandValidator : AbstractValidator<DeleteServiceCommand>
{
    public DeleteServiceCommandValidator()
    {
        RuleFor(c => c.ServiceId)
            .NotEmpty().WithMessage("O id do serviço é obrigatório.");
    }
}
