using FluentValidation;

namespace ServicesService.Application.Clients.GetClientById;

public sealed class GetClientByIdQueryValidator : AbstractValidator<GetClientByIdQuery>
{
    public GetClientByIdQueryValidator()
    {
        RuleFor(query => query.ClientId)
            .NotEmpty()
            .WithErrorCode("Client.IdRequired")
            .WithMessage("O id da pessoa é obrigatório.");
    }
}
