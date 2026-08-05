using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Services.CreateService;

public static class CreateServiceCommandExtensions
{
    public static DomainResult<Service> ToModel(this CreateServiceCommand command, int code, IReadOnlyCollection<Tag> tags)
    {
        var durationResult = DurationRange.Create(command.MinDurationMinutes, command.DurationMinutes, command.MaxDurationMinutes);
        if (durationResult.IsFailure)
        {
            return DomainResult.Failure<Service>(durationResult.Error);
        }

        var serviceResult = Service.Create(
            Guid.CreateVersion7(),
            command.Name,
            command.Description,
            durationResult.Value,
            command.Price,
            command.MaxDiscountPercentage,
            command.CategoryId,
            code);

        if (serviceResult.IsFailure)
        {
            return serviceResult;
        }

        serviceResult.Value.SetTags(tags);

        return serviceResult;
    }
}
