using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.ListServices;

public sealed class ListServicesQueryHandler : IQueryHandler<ListServicesQuery, PagedResult<ServiceResponse>>
{
    private readonly IServiceRepository _serviceRepository;
    private readonly ICategoryRepository _categoryRepository;

    public ListServicesQueryHandler(IServiceRepository serviceRepository, ICategoryRepository categoryRepository)
    {
        _serviceRepository = serviceRepository;
        _categoryRepository = categoryRepository;
    }

    public async Task<Result<PagedResult<ServiceResponse>>> Handle(
        ListServicesQuery query,
        CancellationToken cancellationToken)
    {
        var filter = ServiceListFilter.Create(query.Page, query.PageSize, query.Search, query.CategoryId, query.TagId);

        var services = await _serviceRepository.ListAsync(filter, cancellationToken);

        var categoryNamesById = await CategoryNamesAsync(services.Items, cancellationToken);

        return Result.Success(services.Map(service => ServiceResponse.FromService(service, CategoryNameOf(service, categoryNamesById))));
    }

    private async Task<Dictionary<Guid, string>> CategoryNamesAsync(
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

        var categories = await _categoryRepository.GetByIdsAsync(categoryIds, cancellationToken);

        return categories.ToDictionary(category => category.Id, category => category.Name);
    }

    private static string? CategoryNameOf(Service service, Dictionary<Guid, string> categoryNamesById)
    {
        if (service.CategoryId is not { } categoryId)
        {
            return null;
        }

        return categoryNamesById.GetValueOrDefault(categoryId);
    }
}
