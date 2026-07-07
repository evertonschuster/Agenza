using IdentityService.Application.Abstractions;

namespace IdentityService.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly IdentityDataContext _dbContext;

    public UnitOfWork(IdentityDataContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task ExecuteInTransactionAsync(
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            await operation(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
