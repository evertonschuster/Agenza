using FluentValidation;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Categories.CreateCategory;

public sealed class CreateCategoryCommandValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryCommandValidator()
    {
        RuleFor(c => c.Name)
            .NotEmpty().WithMessage("O nome da categoria é obrigatório.")
            .MaximumLength(Category.NameMaxLength)
            .WithMessage($"O nome da categoria deve ter no máximo {Category.NameMaxLength} caracteres.");
    }
}
