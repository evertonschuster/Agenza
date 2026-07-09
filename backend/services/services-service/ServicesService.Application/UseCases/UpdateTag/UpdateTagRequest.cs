namespace ServicesService.Application.UseCases.UpdateTag;

public record UpdateTagRequest(Guid TenantId, Guid TagId, string Name, string Color, string? Description);
