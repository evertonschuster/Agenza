using FluentValidation;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.DeleteCategory;

public sealed class DeleteCategoryCommandValidator : AbstractValidator<DeleteCategoryCommand>
{
    public DeleteCategoryCommandValidator(ICategoryRepository categoryRepository)
    {
        RuleFor(c => c.CategoryId)
            .MustAsync(async (id, ct) => await categoryRepository.GetByIdAsync(id, ct) is not null)
            .WithErrorCode("Category.NotFound")
            .WithMessage(c => $"Categoria '{c.CategoryId}' não foi encontrada.");
    }
}
