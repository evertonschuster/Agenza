using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.GetCategoryById;

public sealed class GetCategoryByIdQueryHandler : IQueryHandler<GetCategoryByIdQuery, CategoryResponse>
{
    private readonly ICategoryRepository _categoryRepository;

    public GetCategoryByIdQueryHandler(ICategoryRepository categoryRepository)
    {
        _categoryRepository = categoryRepository;
    }

    public async Task<Result<CategoryResponse>> Handle(GetCategoryByIdQuery query, CancellationToken cancellationToken)
    {
        var category = await _categoryRepository.GetByIdAsync(query.CategoryId, cancellationToken);
        if (category is null)
        {
            return Result.Failure<CategoryResponse>(
                Error.NotFound("Category.NotFound", $"Categoria '{query.CategoryId}' não foi encontrada."));
        }

        return CategoryResponse.FromCategory(category);
    }
}
