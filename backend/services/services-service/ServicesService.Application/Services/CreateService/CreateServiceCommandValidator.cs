using FluentValidation;

namespace ServicesService.Application.Services.CreateService;

public sealed class CreateServiceCommandValidator : AbstractValidator<CreateServiceCommand>
{
    public CreateServiceCommandValidator()
    {
        RuleFor(command => command.Name).MustBeValidName();
        RuleFor(command => command.InternalDescription).MustBeValidInternalDescription();
        RuleFor(command => command.ClientDescription).MustBeValidClientDescription();
        RuleFor(command => command.TagIds).MustBeValidTagIds();
        RuleFor(command => command.DurationMinutes).MustBeValidDuration();
        RuleFor(command => command.PreparationMinutes).MustBeValidPreparation();
        RuleFor(command => command.CleanupMinutes).MustBeValidCleanup();
        RuleFor(command => command.MinDurationMinutes).MustBeValidMinDuration();
        RuleFor(command => command.MaxDurationMinutes)
            .MustBeValidMaxDuration(command => command.MinDurationMinutes);
        RuleFor(command => command.DurationMinutes)
            .MustBeWithinTheDurationLimits(command => command.MinDurationMinutes, command => command.MaxDurationMinutes);
        RuleFor(command => command.PricingType).MustBeAKnownPricingType();
        RuleFor(command => command.Price).MustMatchThePricingType(command => command.PricingType);
        RuleFor(command => command.Price).MustBeValidPrice();
        RuleFor(command => command.MaxDiscountPercentage).MustBeValidMaxDiscount();
    }
}
