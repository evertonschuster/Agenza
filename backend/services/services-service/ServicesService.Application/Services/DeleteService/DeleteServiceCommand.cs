using Admin.SharedKernel;

namespace ServicesService.Application.Services.DeleteService;

public sealed record DeleteServiceCommand(Guid ServiceId) : ICommand;
