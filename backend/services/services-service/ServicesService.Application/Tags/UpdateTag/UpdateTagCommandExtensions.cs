using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Tags.UpdateTag;

public static class UpdateTagCommandExtensions
{
    public static void ApplyTo(this UpdateTagCommand command, Tag tag) =>
        tag.Update(command.Name, TagColor.From(command.Color), command.Description);
}
