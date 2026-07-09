namespace ServicesService.Application.Abstractions;

/// <summary>
/// Commits changes tracked across this request's repositories in one
/// SaveChanges call. Repositories only stage changes (Add/Remove/mutate
/// a tracked entity) - command handlers decide the commit boundary by
/// calling this explicitly, so a handler that needs two repository
/// calls in future commits them atomically instead of each repository
/// call committing on its own.
///
/// Simpler than identity-service's IUnitOfWork.ExecuteInTransactionAsync
/// by design: that one wraps genuinely cross-abstraction writes (EF
/// repository + ASP.NET Identity's UserManager, which manages its own
/// SaveChanges), which needs an explicit database transaction. Every
/// write here goes through EF alone, so a single SaveChangesAsync call
/// is already atomic - no explicit transaction needed.
/// </summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
