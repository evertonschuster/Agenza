using Admin.SharedKernel;

namespace ServicesService.Application.Categories.UpdateCategory;

public sealed record UpdateCategoryCommand(Guid CategoryId, string Name) : ICommand<CategoryResponse>;
