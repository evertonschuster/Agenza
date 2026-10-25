namespace ServicesService.Application.Abstractions;

public interface IAppointmentRepository
{
    Task<bool> HasUpcomingAppointmentsAsync(Guid clientId, CancellationToken cancellationToken);

    Task<bool> HasAppointmentsAsync(Guid clientId, CancellationToken cancellationToken);
}
