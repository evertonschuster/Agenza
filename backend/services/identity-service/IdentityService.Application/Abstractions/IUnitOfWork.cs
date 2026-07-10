using Admin.SharedKernel;

namespace IdentityService.Application.Abstractions;

// operation's own Result.Failure rolls the transaction back like a thrown exception would, but returns normally instead of throwing.
public interface IUnitOfWork
{
    Task<Result<TResult>> ExecuteInTransactionAsync<TResult>(
        Func<CancellationToken, Task<Result<TResult>>> operation,
        CancellationToken cancellationToken);
}
