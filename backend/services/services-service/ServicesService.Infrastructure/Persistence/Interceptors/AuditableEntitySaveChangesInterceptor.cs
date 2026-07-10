using Admin.Identity.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using ServicesService.Domain.Common;

namespace ServicesService.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Stamps BaseEntity's audit fields on every save and turns a tracked
/// delete into a soft delete (DeletedAt/DeletedBy set, state reverted to
/// Modified) so a repository's Remove() never actually removes a row -
/// the paired HasQueryFilter(DeletedAt == null) then hides it from every
/// read.
/// </summary>
public class AuditableEntitySaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly TimeProvider _timeProvider;

    public AuditableEntitySaveChangesInterceptor(ICurrentUserAccessor currentUserAccessor, TimeProvider timeProvider)
    {
        _currentUserAccessor = currentUserAccessor;
        _timeProvider = timeProvider;
    }

    public override InterceptionResult<int> SavingChanges(DbContextEventData eventData, InterceptionResult<int> result)
    {
        StampAuditFields(eventData.Context);
        return base.SavingChanges(eventData, result);
    }

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        StampAuditFields(eventData.Context);
        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    private void StampAuditFields(DbContext? context)
    {
        if (context is null)
        {
            return;
        }

        var now = _timeProvider.GetUtcNow();
        var actorId = _currentUserAccessor.UserId;

        foreach (var entry in context.ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.MarkCreated(actorId, now);
                    break;
                case EntityState.Modified:
                    entry.Entity.MarkUpdated(actorId, now);
                    break;
                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.MarkDeleted(actorId, now);
                    break;
            }
        }
    }
}
