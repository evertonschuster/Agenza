using FluentValidation;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Tags.UpdateTag;

public sealed class UpdateTagCommandValidator : AbstractValidator<UpdateTagCommand>
{
    public UpdateTagCommandValidator()
    {
        RuleFor(command => command.TagId)
            .NotEmpty().WithMessage("O id da etiqueta é obrigatório.");

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
