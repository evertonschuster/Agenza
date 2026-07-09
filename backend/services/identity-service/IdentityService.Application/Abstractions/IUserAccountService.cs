namespace IdentityService.Application.Abstractions;

public record UserAccountResult(Guid UserId, string Email);

/// <summary>
/// Boundary to the identity/credential store (ASP.NET Core Identity in
/// Infrastructure). Application layer only ever sees plain values in/out -
/// it has no knowledge of IdentityUser, UserManager, or password hashing.
/// </summary>
public interface IUserAccountService
{
    Task<UserAccountResult> CreateOwnerAsync(
        Guid tenantId,
        string email,
        string password,
        CancellationToken cancellationToken);
}
