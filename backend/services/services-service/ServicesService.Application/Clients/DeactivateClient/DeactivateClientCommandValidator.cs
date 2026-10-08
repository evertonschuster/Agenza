using FluentValidation;

namespace ServicesService.Application.Clients.DeactivateClient;

public sealed class DeactivateClientCommandValidator : AbstractValidator<DeactivateClientCommand>
{
    public DeactivateClientCommandValidator()
    {
        RuleFor(command => command.ClientId)
            .NotEmpty()
            .WithErrorCode("Client.IdRequired")
            .WithMessage("O id da pessoa é obrigatório.");
    }
}
