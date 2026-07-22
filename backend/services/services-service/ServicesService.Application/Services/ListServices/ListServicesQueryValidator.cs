using FluentValidation;

namespace ServicesService.Application.Services.ListServices;

public sealed class ListServicesQueryValidator : AbstractValidator<ListServicesQuery>
{
    public ListServicesQueryValidator()
    {
        RuleFor(query => query.Page)
            .GreaterThanOrEqualTo(1).WithMessage("A página deve ser maior ou igual a 1.");

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, 100).WithMessage("O tamanho da página deve ser entre 1 e 100.");
    }
}
