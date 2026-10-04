using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Services.CreateService;

public static class CreateServiceCommandExtensions
{
    public static DomainResult<Service> ToModel(this CreateServiceCommand command, int code)
    {
        var durationResult = DurationRange.Create(
            command.MinDurationMinutes,
            command.DurationMinutes,
            command.MaxDurationMinutes);
        if (durationResult.IsFailure)
        {
            return DomainResult.Failure<Service>(durationResult.Error);
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
            command.Description,
            durationResult.Value,
            priceResult.Value,
            maxDiscountResult.Value,
            command.CategoryId,
            command.TagIds ?? [],
            code);
    }
}
