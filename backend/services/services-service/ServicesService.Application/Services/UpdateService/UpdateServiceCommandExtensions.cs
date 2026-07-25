using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Services.UpdateService;

public static class UpdateServiceCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateServiceCommand command, Service service)
    {
        var durationResult = DurationRange.Create(command.MinDurationMinutes, command.DurationMinutes, command.MaxDurationMinutes);
        if (durationResult.IsFailure)
        {
            return DomainResult.Failure(durationResult.Error);
        }

        return service.Update(
            command.Name,
            command.Description,
            durationResult.Value,
            command.Price,
            command.MaxDiscountPercentage,
            command.CategoryId);
    }
}
