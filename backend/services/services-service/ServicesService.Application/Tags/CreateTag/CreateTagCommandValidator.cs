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
            .NotEmpty()
            .MaximumLength(Tag.NameMaxLength);

        RuleFor(command => command.Color)
            .NotEmpty()
            .Must(color => TagColor.Palette.Contains(color.Trim().ToLowerInvariant()))
            .WithMessage($"Tag color must be one of: {string.Join(", ", TagColor.Palette)}.");

        RuleFor(command => command.Description)
            .MaximumLength(Tag.DescriptionMaxLength);
    }
}
