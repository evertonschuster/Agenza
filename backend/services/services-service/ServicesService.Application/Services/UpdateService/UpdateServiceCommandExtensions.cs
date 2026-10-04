using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Services.UpdateService;

public static class UpdateServiceCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateServiceCommand command, Service service)
    {
        var durationResult = DurationRange.Create(
            command.MinDurationMinutes,
            command.DurationMinutes,
            command.MaxDurationMinutes);
        if (durationResult.IsFailure)
        {
            return DomainResult.Failure(durationResult.Error);
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
            command.Description,
            durationResult.Value,
            priceResult.Value,
            maxDiscountResult.Value,
            command.CategoryId,
            command.TagIds ?? []);
    }
}
