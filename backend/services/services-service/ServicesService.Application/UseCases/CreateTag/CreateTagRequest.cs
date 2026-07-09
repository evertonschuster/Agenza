namespace ServicesService.Application.UseCases.CreateTag;

public record CreateTagRequest(Guid TenantId, string Name, string Color, string? Description);
