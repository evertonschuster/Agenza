using FluentValidation;

namespace ServicesService.Application.Services.CreateService;

public sealed class CreateServiceCommandValidator : AbstractValidator<CreateServiceCommand>
{
    public CreateServiceCommandValidator()
    {
        RuleFor(command => command.Name).MustBeValidName();
        RuleFor(command => command.Description).MustBeValidDescription();
        RuleFor(command => command.MinDurationMinutes).MustBeValidMinDuration();
        RuleFor(command => command.MaxDurationMinutes)
            .MustBeValidMaxDuration(command => command.MinDurationMinutes);
        RuleFor(command => command.DurationMinutes)
            .MustBeWithinTheDurationRange(command => command.MinDurationMinutes, command => command.MaxDurationMinutes);
        RuleFor(command => command.Price).MustBeValidPrice();
        RuleFor(command => command.MaxDiscountPercentage).MustBeValidMaxDiscount();
        RuleFor(command => command.TagIds).MustBeValidTagIds();
    }
}
