using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.ListCategories;

public sealed class ListCategoriesQueryHandler : IQueryHandler<ListCategoriesQuery, IReadOnlyList<CategoryResponse>>
{
    private readonly ICategoryRepository _categoryRepository;

    public ListCategoriesQueryHandler(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<Result<IReadOnlyList<CategoryResponse>>> Handle(
        ListCategoriesQuery query,
        CancellationToken cancellationToken)
    {
        var categories = await _categoryRepository.ListAsync(query.Search, cancellationToken);
        IReadOnlyList<CategoryResponse> response = categories.Select(CategoryResponse.FromCategory).ToList();

        return Result.Success(response);
    }
}
