namespace Admin.Identity.Client;

/// <summary>
/// The authenticated principal's user id ("sub" claim), for stamping
/// BaseEntity's CreatedBy/UpdatedBy/DeletedBy. Returns null for
/// principals with no "sub" claim (e.g. client_credentials/M2M tokens),
/// which is a valid audit value - those writes have no human actor.
/// </summary>
public interface ICurrentUserAccessor
{
    Guid? UserId { get; }
}
