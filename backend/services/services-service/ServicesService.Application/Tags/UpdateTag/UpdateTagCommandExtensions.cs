using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Tags.UpdateTag;

public static class UpdateTagCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateTagCommand command, Tag tag)
    {
        var colorResult = TagColor.Create(command.Color);
        if (colorResult.IsFailure)
        {
            return DomainResult.Failure(colorResult.Error);
        }

        return tag.Update(command.Name, colorResult.Value, command.Description);
    }
}
