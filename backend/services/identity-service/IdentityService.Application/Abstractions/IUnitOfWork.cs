using Admin.SharedKernel;

namespace IdentityService.Application.Abstractions;

/// <summary>
/// Lets a use case group multiple repository/service writes into one
/// atomic operation without the Application layer depending on EF Core
/// directly (Clean Architecture: Application has zero Infrastructure deps).
///
/// Result-aware: <paramref name="operation"/>'s own Result.Failure (e.g.
/// "that email is already taken") rolls the transaction back exactly
/// like a thrown exception would, but returns normally - avoids
/// exceptions for business errors (docs/adr/0005). An operation that
/// actually throws (a genuinely unexpected failure - e.g. the database
/// connection drops) still rolls back and rethrows; Result is for
/// expected outcomes, not infrastructure failures.
/// </summary>
public interface IUnitOfWork
{
    Task<Result<TResult>> ExecuteInTransactionAsync<TResult>(
        Func<CancellationToken, Task<Result<TResult>>> operation,
        CancellationToken cancellationToken);
}
