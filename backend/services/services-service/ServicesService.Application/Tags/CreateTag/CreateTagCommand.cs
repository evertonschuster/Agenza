using Admin.SharedKernel;

namespace ServicesService.Application.Tags.CreateTag;

public sealed record CreateTagCommand(Guid TenantId, string Name, string Color, string? Description)
    : ICommand<TagResponse>;
