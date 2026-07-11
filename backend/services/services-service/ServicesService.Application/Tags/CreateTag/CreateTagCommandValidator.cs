using FluentValidation;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Tags.CreateTag;

// Cross-tenant name uniqueness needs a repository round-trip, so it stays in CreateTagCommandHandler, not here.
public sealed class CreateTagCommandValidator : AbstractValidator<CreateTagCommand>
{
    public CreateTagCommandValidator()
    {
        RuleFor(command => command.Name)
            .NotEmpty().WithMessage("O nome da etiqueta é obrigatório.")
            .MaximumLength(Tag.NameMaxLength)
            .WithMessage($"O nome da etiqueta deve ter no máximo {Tag.NameMaxLength} caracteres.");

        RuleFor(command => command.Color)
            .NotEmpty().WithMessage("A cor da etiqueta é obrigatória.")
            .Must(color => TagColor.Palette.Contains(color.Trim().ToLowerInvariant()))
            .WithMessage($"A cor da etiqueta deve ser uma das seguintes: {string.Join(", ", TagColor.Palette)}.");

        RuleFor(command => command.Description)
            .MaximumLength(Tag.DescriptionMaxLength)
            .WithMessage($"A descrição da etiqueta deve ter no máximo {Tag.DescriptionMaxLength} caracteres.");
    }
}
