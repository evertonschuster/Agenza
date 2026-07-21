using FluentValidation;

namespace ServicesService.Application.Tags.DeleteTag;

public sealed class DeleteTagCommandValidator : AbstractValidator<DeleteTagCommand>
{
    public DeleteTagCommandValidator()
    {
        RuleFor(c => c.TagId)
            .NotEmpty().WithMessage("O id da etiqueta é obrigatório.");
    }
}
