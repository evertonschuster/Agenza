namespace Admin.SharedKernel;

/// <summary>
/// Every entity id in the app is a UUID v7 (RFC 9562) instead of v4:
/// the timestamp prefix keeps ids roughly sortable by creation time,
/// which avoids the index fragmentation v4's fully-random ids cause on
/// the primary key. Handlers call this instead of Guid.NewGuid()
/// wherever a new aggregate root id is minted.
/// </summary>
public static class IdGenerator
{
    public static Guid NewId() => Guid.CreateVersion7();
}
