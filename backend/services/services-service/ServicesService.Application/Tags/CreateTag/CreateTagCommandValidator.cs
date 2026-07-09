using FluentValidation;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Tags.CreateTag;

/// <summary>
/// Cheap, synchronous shape checks the dispatcher runs before the handler
/// - fails fast without touching the repository. The cross-tenant name
/// uniqueness rule is NOT here: it needs a repository round-trip, so it
/// stays in CreateTagCommandHandler (Tag's own invariants are the
/// second line of defense - see docs/adr/0005).
/// </summary>
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
