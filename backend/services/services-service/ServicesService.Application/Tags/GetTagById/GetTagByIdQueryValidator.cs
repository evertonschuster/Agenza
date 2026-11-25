using FluentValidation;

namespace ServicesService.Application.Tags.GetTagById;

public sealed class GetTagByIdQueryValidator : AbstractValidator<GetTagByIdQuery>
{
    public GetTagByIdQueryValidator()
    {
        RuleFor(query => query.TagId)
            .NotEmpty().WithMessage("O ID da etiqueta é obrigatório.");
    }
}
