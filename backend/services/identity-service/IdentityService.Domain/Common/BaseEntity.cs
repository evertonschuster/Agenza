namespace IdentityService.Domain.Common;

/// <summary>
/// Base audit shape for every aggregate root in this service. Not shared
/// across services (Domain has zero project references - backend/CLAUDE.md)
/// - each service's Domain owns its own copy, kept in sync by convention
/// since it never carries business rules.
///
/// Mark*/IsDeleted are behavior methods, not property setters (rich
/// domain model rule) - the EF SaveChanges interceptor calls them, it
/// never sets CreatedAt/UpdatedAt/DeletedAt directly. Delete is soft:
/// DeletedAt/DeletedBy record the fact, the interceptor turns a tracked
/// delete into an update, and a global query filter excludes deleted
/// rows from every read.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public Guid? CreatedBy { get; private set; }
    public DateTimeOffset? UpdatedAt { get; private set; }
    public Guid? UpdatedBy { get; private set; }
    public DateTimeOffset? DeletedAt { get; private set; }
    public Guid? DeletedBy { get; private set; }

    public bool IsDeleted => DeletedAt is not null;

    protected BaseEntity()
    {
    }

    protected BaseEntity(Guid id)
    {
        Id = id;
    }

    public void MarkCreated(Guid? actorId, DateTimeOffset occurredAt)
    {
        CreatedAt = occurredAt;
        CreatedBy = actorId;
    }

    public void MarkUpdated(Guid? actorId, DateTimeOffset occurredAt)
    {
        UpdatedAt = occurredAt;
        UpdatedBy = actorId;
    }

    public void MarkDeleted(Guid? actorId, DateTimeOffset occurredAt)
    {
        DeletedAt = occurredAt;
        DeletedBy = actorId;
    }
}
