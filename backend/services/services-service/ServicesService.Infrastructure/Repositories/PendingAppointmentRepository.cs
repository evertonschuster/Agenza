using ServicesService.Application.Abstractions;

namespace ServicesService.Infrastructure.Repositories;

public class PendingAppointmentRepository : IAppointmentRepository
{
    public Task<bool> HasUpcomingAppointmentsAsync(Guid clientId, CancellationToken cancellationToken)
    {
        return Task.FromResult(false);
    }
}
