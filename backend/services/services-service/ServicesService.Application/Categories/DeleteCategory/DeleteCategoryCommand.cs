using Admin.SharedKernel;

namespace ServicesService.Application.Categories.DeleteCategory;

public sealed record DeleteCategoryCommand(Guid CategoryId) : ICommand;
