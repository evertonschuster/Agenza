using Admin.Identity.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Common;

namespace ServicesService.Infrastructure.Persistence.Interceptors;

/// <summary>
/// Stamps BaseEntity's audit fields on every save and turns a tracked
/// delete into a soft delete (DeletedAt/DeletedBy set, state reverted to
/// Modified) so a repository's Remove() never actually removes a row -
/// the paired HasQueryFilter(DeletedAt == null) then hides it from every
/// read. Also assigns TenantId on a newly added ITenantOwned entity that
/// wasn't given one explicitly (docs/adr/0008) - throws rather than
/// persisting a tenant-less row if no tenant is available.
/// </summary>
public class AuditableEntitySaveChangesInterceptor : SaveChangesInterceptor
{
    private readonly ICurrentUserAccessor _currentUserAccessor;
    private readonly ICurrentTenantProvider _currentTenantProvider;
    private readonly TimeProvider _timeProvider;

    public AuditableEntitySaveChangesInterceptor(
        ICurrentUserAccessor currentUserAccessor,
        ICurrentTenantProvider currentTenantProvider,
        TimeProvider timeProvider)
    {
        _currentUserAccessor = currentUserAccessor;
        _currentTenantProvider = currentTenantProvider;
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
                    AssignTenantIfNeeded(entry.Entity);
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

    private void AssignTenantIfNeeded(BaseEntity entity)
    {
        if (entity is not ITenantOwned { TenantId: var tenantId } tenantOwned || tenantId != Guid.Empty)
        {
            return;
        }

        if (!_currentTenantProvider.TryGetTenantId(out var currentTenantId))
        {
            throw new InvalidOperationException(
                $"Cannot persist a new {entity.GetType().Name} - no tenant is available in the current context.");
        }

        tenantOwned.AssignTenant(currentTenantId);
    }
}
