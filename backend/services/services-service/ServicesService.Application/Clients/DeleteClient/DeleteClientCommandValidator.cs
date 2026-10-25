using FluentValidation;

namespace ServicesService.Application.Clients.DeleteClient;

public sealed class DeleteClientCommandValidator : AbstractValidator<DeleteClientCommand>
{
    public DeleteClientCommandValidator()
    {
        RuleFor(command => command.ClientId)
            .NotEmpty()
            .WithErrorCode("Client.IdRequired")
            .WithMessage("O id da pessoa é obrigatório.");
    }
}
