using Admin.SharedKernel;

namespace IdentityService.Application.Abstractions;

public record UserAccountResult(Guid UserId, string Email);

public interface IUserAccountService
{
    Task<Result<UserAccountResult>> CreateOwnerAsync(
        Guid tenantId,
        string email,
        string password,
        CancellationToken cancellationToken);
}
