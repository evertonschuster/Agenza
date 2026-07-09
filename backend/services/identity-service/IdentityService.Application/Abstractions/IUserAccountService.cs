using Admin.SharedKernel;

namespace IdentityService.Application.Abstractions;

public record UserAccountResult(Guid UserId, string Email);

/// <summary>
/// Boundary to the identity/credential store (ASP.NET Core Identity in
/// Infrastructure). Application layer only ever sees plain values in/out -
/// it has no knowledge of IdentityUser, UserManager, or password hashing.
/// A rejected email/password (duplicate, too weak, ...) is a Result
/// failure, not an exception - it's an expected outcome of provisioning,
/// not a bug.
/// </summary>
public interface IUserAccountService
{
    Task<Result<UserAccountResult>> CreateOwnerAsync(
        Guid tenantId,
        string email,
        string password,
        CancellationToken cancellationToken);
}
