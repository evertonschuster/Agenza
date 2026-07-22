using FluentValidation;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Categories.UpdateCategory;

public sealed class UpdateCategoryCommandValidator : AbstractValidator<UpdateCategoryCommand>
{
    public UpdateCategoryCommandValidator()
    {
        RuleFor(c => c.CategoryId)
            .NotEmpty().WithMessage("O id da categoria é obrigatório.");

        RuleFor(c => c.Name)
            .NotEmpty().WithMessage("O nome da categoria é obrigatório.")
            .MaximumLength(Category.NameMaxLength)
            .WithMessage($"O nome da categoria deve ter no máximo {Category.NameMaxLength} caracteres.");
    }
}
