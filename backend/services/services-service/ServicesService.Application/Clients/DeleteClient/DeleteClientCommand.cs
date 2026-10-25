using Admin.SharedKernel;

namespace ServicesService.Application.Clients.DeleteClient;

public sealed record DeleteClientCommand(Guid ClientId) : ICommand;
