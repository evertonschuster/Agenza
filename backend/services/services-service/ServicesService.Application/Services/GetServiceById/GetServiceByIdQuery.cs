using Admin.SharedKernel;

namespace ServicesService.Application.Services.GetServiceById;

public sealed record GetServiceByIdQuery(Guid ServiceId) : IQuery<ServiceResponse>;
