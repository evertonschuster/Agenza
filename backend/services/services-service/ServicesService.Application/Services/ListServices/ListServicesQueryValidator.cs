using FluentValidation;

namespace ServicesService.Application.Services.ListServices;

public sealed class ListServicesQueryValidator : AbstractValidator<ListServicesQuery>
{
    private const string InvalidPageCode = "Page.Invalid";
    private const string InvalidPageSizeCode = "PageSize.Invalid";
    private const int MaxPageSize = 100;

    public ListServicesQueryValidator()
    {
        RuleFor(query => query.Page)
            .GreaterThanOrEqualTo(1)
            .WithErrorCode(InvalidPageCode)
            .WithMessage("A página deve ser maior ou igual a 1.");

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, MaxPageSize)
            .WithErrorCode(InvalidPageSizeCode)
            .WithMessage($"O tamanho da página deve ser entre 1 e {MaxPageSize}.");
    }
}
