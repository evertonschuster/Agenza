using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace IdentityService.Infrastructure.Identity;

/// <summary>
/// Adds the tenant_id claim (docs/DOMAIN.md) onto every principal built for
/// an ApplicationUser, so it flows into id_token/access_token whenever the
/// "tenant_id" scope is requested - matching what the frontend's
/// OidcAuthRepository/session mapper already expects.
/// </summary>
public class TenantClaimsPrincipalFactory : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole<Guid>>
{
    public TenantClaimsPrincipalFactory(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        IOptions<IdentityOptions> options)
        : base(userManager, roleManager, options)
    {
    }

    public override async Task<ClaimsPrincipal> CreateAsync(ApplicationUser user)
    {
        var principal = await base.CreateAsync(user);
        ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim("tenant_id", user.TenantId.ToString()));
        return principal;
    }
}
