using FluentValidation;

namespace ServicesService.Application.Clients.ReactivateClient;

public sealed class ReactivateClientCommandValidator : AbstractValidator<ReactivateClientCommand>
{
    public ReactivateClientCommandValidator()
    {
        RuleFor(command => command.ClientId)
            .NotEmpty()
            .WithErrorCode("Client.IdRequired")
            .WithMessage("O id da pessoa é obrigatório.");
    }
}
