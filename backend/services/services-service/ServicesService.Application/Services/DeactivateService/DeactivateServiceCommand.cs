using Admin.SharedKernel;

namespace ServicesService.Application.Services.DeactivateService;

public sealed record DeactivateServiceCommand(Guid ServiceId) : ICommand;
