using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Tags.CreateTag;

public static class CreateTagCommandExtensions
{
    public static Tag ToModel(this CreateTagCommand command, Guid tenantId) =>
        new(Guid.CreateVersion7(), tenantId, command.Name, TagColor.From(command.Color), command.Description);
}
