namespace IdentityService.Application.Abstractions;

/// <summary>
/// Lets a use case group multiple repository/service writes into one
/// atomic operation without the Application layer depending on EF Core
/// directly (Clean Architecture: Application has zero Infrastructure deps).
/// </summary>
public interface IUnitOfWork
{
    /// <summary>
    /// Runs <paramref name="operation"/> inside a database transaction,
    /// committing on success and rolling back if it throws.
    /// </summary>
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken);
}
