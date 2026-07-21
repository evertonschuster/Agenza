using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services;

// Loads and validates a Service's Category/Tags exactly once per request,
// returning the same instances CreateService/UpdateService then persist and
// read the response from - avoids the duplicate existence-check-then-refetch
// queries the validator/handler split used to produce (docs/adr/0013).
public sealed class ServiceRelationshipLoader
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly ITagRepository _tagRepository;

    public ServiceRelationshipLoader(ICategoryRepository categoryRepository, ITagRepository tagRepository)
    {
        _categoryRepository = categoryRepository;
        _tagRepository = tagRepository;
    }

    public async Task<Result<ServiceRelationships>> LoadAsync(
        Guid? categoryId,
        IReadOnlyList<Guid>? tagIds,
        CancellationToken cancellationToken)
    {
        Category? category = null;
        if (categoryId is { } id)
        {
            category = await _categoryRepository.GetByIdAsync(id, cancellationToken);
            if (category is null)
            {
                return Result.Failure<ServiceRelationships>(
                    Error.NotFound("Category.NotFound", $"Categoria '{id}' não foi encontrada."));
            }
        }

        IReadOnlyList<Tag> tags = [];
        if (tagIds is { Count: > 0 })
        {
            tags = await _tagRepository.GetByIdsAsync(tagIds, cancellationToken);
            if (tags.Count != tagIds.Count)
            {
                return Result.Failure<ServiceRelationships>(
                    Error.NotFound("Tag.NotFound", "Uma ou mais etiquetas informadas não foram encontradas."));
            }
        }

        return new ServiceRelationships(category, tags);
    }
}

public sealed record ServiceRelationships(Category? Category, IReadOnlyList<Tag> Tags);
