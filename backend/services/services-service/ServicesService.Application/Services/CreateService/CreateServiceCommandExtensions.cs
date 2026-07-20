using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services.CreateService;

public static class CreateServiceCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static Service ToModel(this CreateServiceCommand command, int code, IReadOnlyCollection<Tag> tags)
    {
        var service = new Service(
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
        service.SetTags(tags);
        return service;
    }
}
