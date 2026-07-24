namespace Admin.Identity.Client;

// Null for client_credentials/M2M tokens (no "sub" claim) - a valid audit
// value, not an error.
public interface ICurrentUserAccessor
{
    Guid? UserId { get; }
}
