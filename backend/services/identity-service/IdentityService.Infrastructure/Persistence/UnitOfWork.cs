using Admin.SharedKernel;
using IdentityService.Application.Abstractions;
using Microsoft.EntityFrameworkCore.Storage;

namespace IdentityService.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly IdentityDataContext _dbContext;

    public UnitOfWork(IdentityDataContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<Result<TResult>> ExecuteInTransactionAsync<TResult>(
        Func<CancellationToken, Task<Result<TResult>>> operation,
        CancellationToken cancellationToken)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            var result = await operation(cancellationToken);

            if (result.IsSuccess)
            {
                await transaction.CommitAsync(cancellationToken);
            }
            else
            {
                await RollbackBestEffort(transaction);
            }

            return result;
        }
        catch
        {
            await RollbackBestEffort(transaction);
            throw;
        }
    }

    private static async Task RollbackBestEffort(IDbContextTransaction transaction)
    {
        try
        {
            // Best-effort: a failed rollback (e.g. connection already
            // dropped) must not hide the original failure/result below,
            // and the DB rolls back an uncommitted transaction on
            // disconnect regardless.
            await transaction.RollbackAsync(CancellationToken.None);
        }
        catch
        {
        }
    }
}
