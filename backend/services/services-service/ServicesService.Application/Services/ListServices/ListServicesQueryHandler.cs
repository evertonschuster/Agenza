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
        var (services, totalCount) = await _serviceRepository.ListAsync(
            query.Page,
            query.PageSize,
            query.Search,
            query.CategoryId,
            query.TagId,
            cancellationToken);

        // Only the categories this page's services actually reference (at most
        // pageSize distinct ids), not the tenant's entire Category catalog on
        // every page (docs/adr/0013).
        var categoryIds = services
            .Select(service => service.CategoryId)
            .Where(categoryId => categoryId is not null)
            .Select(categoryId => categoryId!.Value)
            .Distinct()
            .ToList();
        var categoryNamesById = categoryIds.Count == 0
            ? new Dictionary<Guid, string>()
            : (await _categoryRepository.GetByIdsAsync(categoryIds, cancellationToken))
                .ToDictionary(category => category.Id, category => category.Name);

        var items = services
            .Select(service => ServiceResponse.FromService(
                service,
                service.CategoryId is { } categoryId && categoryNamesById.TryGetValue(categoryId, out var name)
                    ? name
                    : null))
            .ToList();

        return Result.Success(new PagedResult<ServiceResponse>(items, totalCount, query.Page, query.PageSize));
    }
}
