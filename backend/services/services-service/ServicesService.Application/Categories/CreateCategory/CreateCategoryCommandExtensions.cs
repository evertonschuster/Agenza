using ServicesService.Domain.Entities;

namespace ServicesService.Application.Categories.CreateCategory;

public static class CreateCategoryCommandExtensions
{
    // TenantId is intentionally Guid.Empty - AuditableEntitySaveChangesInterceptor
    // assigns it on save (docs/adr/0008).
    public static Category ToModel(this CreateCategoryCommand command) =>
        new(Guid.CreateVersion7(), command.Name);
}
