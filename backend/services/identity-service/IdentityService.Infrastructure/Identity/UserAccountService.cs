using Admin.SharedKernel;
using IdentityService.Application.Abstractions;
using Microsoft.AspNetCore.Identity;

namespace IdentityService.Infrastructure.Identity;

public class UserAccountService : IUserAccountService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public UserAccountService(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public async Task<Result<UserAccountResult>> CreateOwnerAsync(
        Guid tenantId,
        string email,
        string password,
        CancellationToken cancellationToken)
    {
        var user = new ApplicationUser
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            TenantId = tenantId,
            EmailConfirmed = true,
        };

        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            return Result.Failure<UserAccountResult>(Error.Validation("Owner.CreationFailed", errors));
        }

        return new UserAccountResult(user.Id, email);
    }
}
