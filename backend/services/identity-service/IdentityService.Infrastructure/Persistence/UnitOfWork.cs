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
            try
            {
                // Best-effort: a failed rollback (e.g. connection already
                // dropped) must not hide the original failure below, and
                // the DB rolls back an uncommitted transaction on
                // disconnect regardless.
                await transaction.RollbackAsync(CancellationToken.None);
            }
            catch
            {
            }

            throw;
        }
    }
}
