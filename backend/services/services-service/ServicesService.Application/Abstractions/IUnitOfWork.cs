namespace ServicesService.Application.Abstractions;

// Repositories only stage changes (Add/Remove) - handlers commit explicitly via SaveChangesAsync.
public interface IUnitOfWork
{
    Task<PersistenceResult<int>> SaveChangesAsync(CancellationToken cancellationToken);

    // For a handler that returns early after IServiceCodeGenerator already opened an ambient transaction - closes it without a save.
    Task RollbackAsync(CancellationToken cancellationToken);
}
