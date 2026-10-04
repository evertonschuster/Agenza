using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Services.UpdateService;

public static class UpdateServiceCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateServiceCommand command, Service service)
    {
        var durationResult = ServiceDuration.Create(
            command.DurationMinutes,
            command.PreparationMinutes ?? 0,
            command.CleanupMinutes ?? 0,
            command.MinDurationMinutes,
            command.MaxDurationMinutes);
        if (durationResult.IsFailure)
        {
            return DomainResult.Failure(durationResult.Error);
        }

        if (PricingTypeNames.ToPricingType(command.PricingType) is not { } pricingType)
        {
            return DomainResult.Failure(PricingTypeNames.Unknown);
        }

        var priceResult = Money.Create(command.Price);
        if (priceResult.IsFailure)
        {
            return DomainResult.Failure(priceResult.Error);
        }

        var maxDiscountResult = Percentage.Create(command.MaxDiscountPercentage);
        if (maxDiscountResult.IsFailure)
        {
            return DomainResult.Failure(maxDiscountResult.Error);
        }

        return service.Update(
            command.Name,
            command.CategoryId,
            command.InternalDescription,
            command.ClientDescription,
            durationResult.Value,
            pricingType,
            priceResult.Value,
            maxDiscountResult.Value,
            command.TagIds ?? []);
    }
}
