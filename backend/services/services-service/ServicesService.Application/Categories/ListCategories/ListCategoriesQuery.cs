using Admin.SharedKernel;

namespace ServicesService.Application.Categories.ListCategories;

public sealed record ListCategoriesQuery(string? Search = null) : IQuery<IReadOnlyList<CategoryResponse>>;
