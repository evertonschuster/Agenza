using Admin.SharedKernel;

namespace ServicesService.Application.Categories.GetCategoryById;

public sealed record GetCategoryByIdQuery(Guid CategoryId) : IQuery<CategoryResponse>;
