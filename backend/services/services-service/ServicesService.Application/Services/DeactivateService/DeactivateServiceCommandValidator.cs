using FluentValidation;

namespace ServicesService.Application.Services.DeactivateService;

public sealed class DeactivateServiceCommandValidator : AbstractValidator<DeactivateServiceCommand>
{
    public DeactivateServiceCommandValidator()
    {
        RuleFor(command => command.ServiceId).MustBeAServiceId();
    }
}
