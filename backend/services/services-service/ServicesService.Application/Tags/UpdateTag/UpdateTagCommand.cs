using Admin.SharedKernel;

namespace ServicesService.Application.Tags.UpdateTag;

public sealed record UpdateTagCommand(Guid TenantId, Guid TagId, string Name, string Color, string? Description)
    : ICommand<TagResponse>;
