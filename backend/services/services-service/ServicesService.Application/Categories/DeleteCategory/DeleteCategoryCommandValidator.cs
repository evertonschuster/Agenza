using FluentValidation;
using FluentValidation.Results;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.DeleteCategory;

public sealed class DeleteCategoryCommandValidator : AbstractValidator<DeleteCategoryCommand>
{
    public DeleteCategoryCommandValidator(ICategoryRepository categoryRepository, IServiceRepository serviceRepository)
    {
        RuleFor(c => c.CategoryId)
            .MustAsync(async (id, ct) => await categoryRepository.GetByIdAsync(id, ct) is not null)
            .WithErrorCode("Category.NotFound")
            .WithMessage(c => $"Categoria '{c.CategoryId}' não foi encontrada.");

        RuleFor(c => c.CategoryId).CustomAsync(async (id, context, ct) =>
        {
            var count = await serviceRepository.CountByCategoryIdAsync(id, ct);
            if (count > 0)
            {
                context.AddFailure(new ValidationFailure(
                    nameof(DeleteCategoryCommand.CategoryId),
                    $"Esta categoria está em uso por {count} serviço(s) e não pode ser excluída.")
                {
                    ErrorCode = "Category.InUse",
                });
            }
        });
    }
}
