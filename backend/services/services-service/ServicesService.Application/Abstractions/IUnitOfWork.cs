namespace ServicesService.Application.Abstractions;

// Repositories only stage changes (Add/Remove) - handlers commit explicitly via SaveChangesAsync.
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
