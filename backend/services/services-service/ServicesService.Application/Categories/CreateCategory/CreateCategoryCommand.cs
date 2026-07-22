using Admin.SharedKernel;

namespace ServicesService.Application.Categories.CreateCategory;

public sealed record CreateCategoryCommand(string Name) : ICommand<CategoryResponse>;
