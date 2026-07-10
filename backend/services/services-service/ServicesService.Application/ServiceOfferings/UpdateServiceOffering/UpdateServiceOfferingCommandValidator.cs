using FluentValidation;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.ServiceOfferings.UpdateServiceOffering;

public sealed class UpdateServiceOfferingCommandValidator : AbstractValidator<UpdateServiceOfferingCommand>
{
    public UpdateServiceOfferingCommandValidator()
    {
        RuleFor(command => command.ServiceOfferingId).NotEmpty();

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
