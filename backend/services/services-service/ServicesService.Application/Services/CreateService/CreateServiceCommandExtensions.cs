using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services.CreateService;

public static class CreateServiceCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static DomainResult<Service> ToModel(this CreateServiceCommand command, int code, IReadOnlyCollection<Tag> tags)
    {
        var serviceResult = Service.Create(
            Guid.CreateVersion7(),
            command.Name,
            command.Description,
            command.DurationMinutes,
            command.MinDurationMinutes,
            command.MaxDurationMinutes,
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
