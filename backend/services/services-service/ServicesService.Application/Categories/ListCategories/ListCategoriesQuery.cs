using Admin.SharedKernel;

namespace ServicesService.Application.Categories.ListCategories;

public sealed record ListCategoriesQuery : IQuery<IReadOnlyList<CategoryResponse>>;
