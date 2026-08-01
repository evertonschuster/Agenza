using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Services.CreateService;

public static class CreateServiceCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static DomainResult<Service> ToModel(this CreateServiceCommand command, int code)
    {
        var durationResult = DurationRange.Create(command.MinDurationMinutes, command.DurationMinutes, command.MaxDurationMinutes);
        if (durationResult.IsFailure)
        {
            return DomainResult.Failure<Service>(durationResult.Error);
        }

        return Service.Create(
            Guid.CreateVersion7(),
            command.Name,
            command.Description,
            durationResult.Value,
            command.Price,
            command.MaxDiscountPercentage,
            command.CategoryId,
            code);
    }
}
