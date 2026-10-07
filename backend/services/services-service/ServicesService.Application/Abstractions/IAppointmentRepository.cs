namespace ServicesService.Application.Abstractions;

public interface IAppointmentRepository
{
    Task<bool> ExistsNotCancelledStartingAfterAsync(Guid clientId, DateTimeOffset instant, CancellationToken cancellationToken);
}
