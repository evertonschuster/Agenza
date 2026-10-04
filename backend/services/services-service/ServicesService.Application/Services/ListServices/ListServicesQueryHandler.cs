using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services.ListServices;

public sealed class ListServicesQueryHandler(
    IServiceRepository serviceRepository,
    ICategoryRepository categoryRepository,
    ITagRepository tagRepository) : IQueryHandler<ListServicesQuery, PagedResult<ServiceResponse>>
{
    public async Task<Result<PagedResult<ServiceResponse>>> Handle(
        ListServicesQuery query,
        CancellationToken cancellationToken)
    {
        var (services, totalCount) = await serviceRepository.ListAsync(
            query.Page,
            query.PageSize,
            query.Search,
            query.CategoryId,
            query.TagId,
            cancellationToken);

        var categoryNamesById = await ReadCategoryNamesAsync(services, cancellationToken);
        var tags = await ReadTagsAsync(services, cancellationToken);

        var items = services
            .Select(service => ServiceResponse.FromService(
                service,
                CategoryNameOf(service, categoryNamesById),
                TagsOf(service, tags)))
            .ToList();

        return Result.Success(new PagedResult<ServiceResponse>(items, totalCount, query.Page, query.PageSize));
    }

    private async Task<Dictionary<Guid, string>> ReadCategoryNamesAsync(
        IReadOnlyList<Service> services,
        CancellationToken cancellationToken)
    {
        var categoryIds = services
            .Select(service => service.CategoryId)
            .OfType<Guid>()
            .Distinct()
            .ToList();
        if (categoryIds.Count == 0)
        {
            return [];
        }

        var categories = await categoryRepository.GetByIdsAsync(categoryIds, cancellationToken);
        return categories.ToDictionary(category => category.Id, category => category.Name);
    }

    private async Task<IReadOnlyList<Tag>> ReadTagsAsync(
        IReadOnlyList<Service> services,
        CancellationToken cancellationToken)
    {
        var tagIds = services
            .SelectMany(service => service.Tags)
            .Select(link => link.TagId)
            .Distinct()
            .ToList();
        if (tagIds.Count == 0)
        {
            return [];
        }

        return await tagRepository.GetByIdsAsync(tagIds, cancellationToken);
    }

    private static string? CategoryNameOf(Service service, Dictionary<Guid, string> categoryNamesById)
    {
        if (service.CategoryId is not { } categoryId)
        {
            return null;
        }

        return categoryNamesById.GetValueOrDefault(categoryId);
    }

    private static IReadOnlyList<Tag> TagsOf(Service service, IReadOnlyList<Tag> tags)
    {
        var linkedTagIds = service.Tags.Select(link => link.TagId).ToHashSet();
        return tags.Where(tag => linkedTagIds.Contains(tag.Id)).ToList();
    }
}
