namespace Admin.SharedKernel;

// Null for client_credentials/M2M tokens (no "sub" claim) - a valid audit
// value, not an error.
public interface ICurrentUserAccessor
{
    bool IsAuthenticated { get; }
    Guid? UserId { get; }
    string? Username { get; }
    string? Email { get; }
}
