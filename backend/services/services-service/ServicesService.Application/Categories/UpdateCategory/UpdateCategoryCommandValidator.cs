using FluentValidation;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Categories.UpdateCategory;

public sealed class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator(ICategoryRepository categoryRepository)
    {
        RuleFor(c => c.CategoryId)
            .NotEmpty().WithMessage("O id da categoria é obrigatório.");

        RuleFor(c => c.CategoryId)
            .MustAsync(async (id, ct) => await categoryRepository.GetByIdAsync(id, ct) is not null)
            .WithErrorCode("Category.NotFound")
            .WithMessage(c => $"Categoria '{c.CategoryId}' não foi encontrada.");

        RuleFor(c => c.Name)
            .NotEmpty().WithMessage("O nome da categoria é obrigatório.")
            .MaximumLength(Category.NameMaxLength)
            .WithMessage($"O nome da categoria deve ter no máximo {Category.NameMaxLength} caracteres.");

        RuleFor(c => c)
            .MustAsync(async (c, ct) => !await categoryRepository.NameExistsAsync(c.Name, c.CategoryId, ct))
            .WithErrorCode("Category.DuplicateName")
            .WithMessage(c => $"Já existe uma categoria chamada '{c.Name}'.")
            .OverridePropertyName(nameof(UpdateCategoryCommand.Name));
    }
}
