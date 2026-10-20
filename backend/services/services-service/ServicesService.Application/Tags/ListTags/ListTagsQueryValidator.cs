using Admin.SharedKernel;
using FluentValidation;

namespace ServicesService.Application.Tags.ListTags;

public sealed class ListTagsQueryValidator : AbstractValidator<ListTagsQuery>
{
    public ListTagsQueryValidator()
    {
        RuleFor(query => query.Page)
            .Cascade(CascadeMode.Stop)
            .GreaterThanOrEqualTo(PageRequest.FirstPage)
            .WithErrorCode(PageRequest.PageInvalidCode)
            .WithMessage($"A página deve ser maior ou igual a {PageRequest.FirstPage}.")
            .Must((query, page) => PageRequest.OffsetFits(page, query.PageSize))
            .WithErrorCode(PageRequest.PageTooLargeCode)
            .WithMessage("A página informada está além do limite permitido.");

        RuleFor(query => query.PageSize)
            .InclusiveBetween(1, PageRequest.MaxPageSize)
            .WithErrorCode(PageRequest.PageSizeInvalidCode)
            .WithMessage($"O tamanho da página deve ser entre 1 e {PageRequest.MaxPageSize}.");
    }
}
