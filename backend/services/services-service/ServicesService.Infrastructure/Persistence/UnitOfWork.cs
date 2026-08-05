using Microsoft.EntityFrameworkCore;
using Npgsql;
using ServicesService.Application.Abstractions;

namespace ServicesService.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private const string UniqueViolationSqlState = "23505";

    private readonly ServicesDataContext _dbContext;

    public UnitOfWork(ServicesDataContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PersistenceResult<int>> SaveChangesAsync(CancellationToken cancellationToken)
    {
        // Commits/rolls back alongside any transaction ServiceCodeGenerator began,
        // so a code-sequence increment never survives a rejected save.
        var ambientTransaction = _dbContext.Database.CurrentTransaction;

        try
        {
            var affectedRows = await _dbContext.SaveChangesAsync(cancellationToken);

            if (ambientTransaction is not null)
            {
                await ambientTransaction.CommitAsync(cancellationToken);
            }

            return PersistenceResult.Success(affectedRows);
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception, out var constraintName))
        {
            if (ambientTransaction is not null)
            {
                await ambientTransaction.RollbackAsync(cancellationToken);
            }

            return PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, constraintName));
        }
    }

    public async Task RollbackAsync(CancellationToken cancellationToken)
    {
        var ambientTransaction = _dbContext.Database.CurrentTransaction;
        if (ambientTransaction is not null)
        {
            await ambientTransaction.RollbackAsync(cancellationToken);
        }
    }

    // A race between two concurrent requests that both passed NameExistsAsync
    // before either committed surfaces here as a Postgres unique_violation -
    // the database is the final authority on case-insensitive uniqueness
    //, not the earlier application-level check alone.
    private static bool IsUniqueViolation(DbUpdateException exception, out string? constraintName)
    {
        if (exception.InnerException is PostgresException { SqlState: UniqueViolationSqlState } postgresException)
        {
            constraintName = postgresException.ConstraintName;
            return true;
        }

        constraintName = null;
        return false;
    }
}
