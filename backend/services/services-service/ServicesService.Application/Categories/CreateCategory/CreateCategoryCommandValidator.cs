using FluentValidation;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Categories.CreateCategory;

public sealed class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator(ICategoryRepository categoryRepository)
    {
        RuleFor(c => c.Name)
            .NotEmpty().WithMessage("O nome da categoria é obrigatório.")
            .MaximumLength(Category.NameMaxLength)
            .WithMessage($"O nome da categoria deve ter no máximo {Category.NameMaxLength} caracteres.");

        RuleFor(c => c.Name)
            .MustAsync(async (name, ct) => !await categoryRepository.NameExistsAsync(name, excludeCategoryId: null, ct))
            .WithErrorCode("Category.DuplicateName")
            .WithMessage(c => $"Já existe uma categoria chamada '{c.Name}'.");
    }
}
