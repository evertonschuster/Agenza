namespace ServicesService.Application.UseCases.DeleteTag;

public record DeleteTagRequest(Guid TenantId, Guid TagId);
