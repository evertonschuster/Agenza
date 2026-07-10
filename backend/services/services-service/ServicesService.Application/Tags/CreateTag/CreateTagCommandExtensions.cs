using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Tags.CreateTag;

public static class CreateTagCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static Tag ToModel(this CreateTagCommand command) =>
        new(Guid.CreateVersion7(), command.Name, TagColor.From(command.Color), command.Description);
}
