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
        var categories = await _categoryRepository.ListAsync(search: null, cancellationToken);
        var categoryNamesById = categories.ToDictionary(category => category.Id, category => category.Name);

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
