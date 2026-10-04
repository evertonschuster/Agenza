using Admin.SharedKernel;

namespace ServicesService.Application.Services.ReactivateService;

public sealed record ReactivateServiceCommand(Guid ServiceId) : ICommand;
