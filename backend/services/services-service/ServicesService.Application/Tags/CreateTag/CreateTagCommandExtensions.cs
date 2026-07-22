using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Tags.CreateTag;

public static class CreateTagCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static DomainResult<Tag> ToModel(this CreateTagCommand command)
    {
        var colorResult = TagColor.Create(command.Color);
        if (colorResult.IsFailure)
        {
            return DomainResult.Failure<Tag>(colorResult.Error);
        }

        return Tag.Create(Guid.CreateVersion7(), command.Name, colorResult.Value, command.Description);
    }
}
