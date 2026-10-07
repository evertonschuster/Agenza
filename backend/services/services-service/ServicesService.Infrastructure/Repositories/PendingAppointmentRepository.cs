using ServicesService.Application.Abstractions;

namespace ServicesService.Infrastructure.Repositories;

public class PendingAppointmentRepository : IAppointmentRepository
{
    public Task<bool> ExistsNotCancelledStartingAfterAsync(
        Guid clientId,
        DateTimeOffset instant,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(false);
    }
}
