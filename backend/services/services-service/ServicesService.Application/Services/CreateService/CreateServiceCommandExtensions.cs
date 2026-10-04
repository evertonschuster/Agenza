using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Services.CreateService;

public static class CreateServiceCommandExtensions
{
    public static DomainResult<Service> ToModel(this CreateServiceCommand command, int code)
    {
        var durationResult = ServiceDuration.Create(
            command.DurationMinutes,
            command.PreparationMinutes ?? 0,
            command.CleanupMinutes ?? 0,
            command.MinDurationMinutes,
            command.MaxDurationMinutes);
        if (durationResult.IsFailure)
        {
            return DomainResult.Failure<Service>(durationResult.Error);
        }

        if (PricingTypeNames.ToPricingType(command.PricingType) is not { } pricingType)
        {
            return DomainResult.Failure<Service>(PricingTypeNames.Unknown);
        }

        var priceResult = Money.Create(command.Price);
        if (priceResult.IsFailure)
        {
            return DomainResult.Failure<Service>(priceResult.Error);
        }

        var maxDiscountResult = Percentage.Create(command.MaxDiscountPercentage);
        if (maxDiscountResult.IsFailure)
        {
            return DomainResult.Failure<Service>(maxDiscountResult.Error);
        }

        return Service.Create(
            Guid.CreateVersion7(),
            command.Name,
            command.CategoryId,
            command.InternalDescription,
            command.ClientDescription,
            durationResult.Value,
            pricingType,
            priceResult.Value,
            maxDiscountResult.Value,
            command.TagIds ?? [],
            code);
    }
}
