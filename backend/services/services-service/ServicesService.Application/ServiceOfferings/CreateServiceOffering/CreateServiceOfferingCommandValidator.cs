using FluentValidation;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.ServiceOfferings.CreateServiceOffering;

public sealed class CreateServiceOfferingCommandValidator : AbstractValidator<CreateServiceOfferingCommand>
{
    public CreateServiceOfferingCommandValidator()
    {
        RuleFor(command => command.Name)
            .NotEmpty()
            .MaximumLength(ServiceOffering.NameMaxLength);

        RuleFor(command => command.Description)
            .MaximumLength(ServiceOffering.DescriptionMaxLength);

        RuleFor(command => command.DurationMinutes)
            .InclusiveBetween(1, ServiceOffering.MaxDurationMinutes);

        RuleFor(command => command.Price)
            .GreaterThanOrEqualTo(0);
    }
}
