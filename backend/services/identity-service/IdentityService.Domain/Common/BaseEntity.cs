namespace IdentityService.Domain.Common;

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
