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

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            return await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception, out var constraintName))
        {
            throw new DuplicateEntityException(exception, constraintName);
        }
    }

    // A race between two concurrent requests that both passed NameExistsAsync
    // before either committed surfaces here as a Postgres unique_violation -
    // the database is the final authority on case-insensitive uniqueness
    // (docs/adr/0012), not the earlier application-level check alone.
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
