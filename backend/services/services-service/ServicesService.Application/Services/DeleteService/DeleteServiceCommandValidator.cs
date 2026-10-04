using FluentValidation;

namespace ServicesService.Application.Services.DeleteService;

public sealed class DeleteServiceCommandValidator : AbstractValidator<DeleteServiceCommand>
{
    public DeleteServiceCommandValidator()
    {
        RuleFor(command => command.ServiceId).MustBeAServiceId();
    }
}
