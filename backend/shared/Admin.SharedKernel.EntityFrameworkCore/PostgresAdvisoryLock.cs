using System.Data.Common;
using Microsoft.EntityFrameworkCore;

namespace Admin.SharedKernel.EntityFrameworkCore;

/// <summary>
/// Serializes an explicit PostgreSQL bootstrap across process replicas.
/// The session remains open until the returned handle is disposed.
/// </summary>
public sealed class PostgresAdvisoryLock : IAsyncDisposable
{
    private readonly DbContext _dbContext;
    private readonly string _lockName;
    private bool _disposed;

    private PostgresAdvisoryLock(DbContext dbContext, string lockName)
    {
        _dbContext = dbContext;
        _lockName = lockName;
    }

    public static async Task<PostgresAdvisoryLock> AcquireAsync(
        DbContext dbContext,
        string lockName,
        CancellationToken cancellationToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(lockName);

        await dbContext.Database.OpenConnectionAsync(cancellationToken);

        try
        {
            await ExecuteAsync(
                dbContext,
                "SELECT pg_advisory_lock(hashtext(@lock_name));",
                lockName,
                cancellationToken);
        }
        catch
        {
            await dbContext.Database.CloseConnectionAsync();
            throw;
        }

        return new PostgresAdvisoryLock(dbContext, lockName);
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
        {
            return;
        }

        try
        {
            await ExecuteAsync(
                _dbContext,
                "SELECT pg_advisory_unlock(hashtext(@lock_name));",
                _lockName,
                CancellationToken.None);
        }
        finally
        {
            await _dbContext.Database.CloseConnectionAsync();
            _disposed = true;
        }
    }

    private static async Task ExecuteAsync(
        DbContext dbContext,
        string commandText,
        string lockName,
        CancellationToken cancellationToken)
    {
        await using var command = dbContext.Database.GetDbConnection().CreateCommand();
        command.CommandText = commandText;

        var parameter = command.CreateParameter();
        parameter.ParameterName = "lock_name";
        parameter.Value = lockName;
        command.Parameters.Add(parameter);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }
}
