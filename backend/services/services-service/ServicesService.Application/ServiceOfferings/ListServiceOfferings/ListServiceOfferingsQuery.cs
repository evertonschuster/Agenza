using Admin.SharedKernel;

namespace ServicesService.Application.ServiceOfferings.ListServiceOfferings;

public sealed record ListServiceOfferingsQuery : IQuery<IReadOnlyList<ServiceOfferingResponse>>;
