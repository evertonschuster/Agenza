using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services.GetServiceById;

public sealed class GetServiceByIdQueryHandler(
    IServiceRepository serviceRepository,
    ICategoryRepository categoryRepository,
    ITagRepository tagRepository) : IQueryHandler<GetServiceByIdQuery, ServiceResponse>
{
    public async Task<Result<ServiceResponse>> Handle(GetServiceByIdQuery query, CancellationToken cancellationToken)
    {
        var service = await serviceRepository.GetByIdAsync(query.ServiceId, cancellationToken);
        if (service is null)
        {
            return Result.Failure<ServiceResponse>(
                Error.NotFound("Service.NotFound", $"Serviço '{query.ServiceId}' não foi encontrado."));
        }

        var categoryName = await ReadCategoryNameAsync(service, cancellationToken);
        var tags = await ReadTagsAsync(service, cancellationToken);

        return ServiceResponse.FromService(service, categoryName, tags);
    }

    private async Task<string?> ReadCategoryNameAsync(Service service, CancellationToken cancellationToken)
    {
        if (service.CategoryId is not { } categoryId)
        {
            return null;
        }

        var category = await categoryRepository.GetByIdAsync(categoryId, cancellationToken);
        return category?.Name;
    }

    private async Task<IReadOnlyList<Tag>> ReadTagsAsync(Service service, CancellationToken cancellationToken)
    {
        if (service.Tags.Count == 0)
        {
            return [];
        }

        var tagIds = service.Tags.Select(link => link.TagId).ToList();
        return await tagRepository.GetByIdsAsync(tagIds, cancellationToken);
    }
}
