using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.ServiceOfferings.ListServiceOfferings;

public sealed class ListServiceOfferingsQueryHandler
    : IQueryHandler<ListServiceOfferingsQuery, IReadOnlyList<ServiceOfferingResponse>>
{
    private readonly IServiceOfferingRepository _serviceOfferingRepository;

    public ListServiceOfferingsQueryHandler(IServiceOfferingRepository serviceOfferingRepository)
    {
        _serviceOfferingRepository = serviceOfferingRepository;
    }

    public async Task<Result<IReadOnlyList<ServiceOfferingResponse>>> Handle(
        ListServiceOfferingsQuery query,
        CancellationToken cancellationToken)
    {
        var serviceOfferings = await _serviceOfferingRepository.ListAsync(cancellationToken);
        IReadOnlyList<ServiceOfferingResponse> response =
            serviceOfferings.Select(ServiceOfferingResponse.FromServiceOffering).ToList();

        return Result.Success(response);
    }
}
