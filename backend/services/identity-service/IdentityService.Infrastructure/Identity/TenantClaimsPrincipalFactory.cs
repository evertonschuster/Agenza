using IdentityService.Application.Abstractions;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace IdentityService.Infrastructure.Identity;

public class TenantClaimsPrincipalFactory : UserClaimsPrincipalFactory<ApplicationUser, IdentityRole<Guid>>
{
    private readonly ITenantRepository _tenantRepository;

    public TenantClaimsPrincipalFactory(
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole<Guid>> roleManager,
        IOptions<IdentityOptions> options,
        ITenantRepository tenantRepository)
        : base(userManager, roleManager, options)
    {
        _tenantRepository = tenantRepository;
    }

    public override async Task<ClaimsPrincipal> CreateAsync(ApplicationUser user)
    {
        var principal = await base.CreateAsync(user);
        ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim("tenant_id", user.TenantId.ToString()));
        var tenant = await _tenantRepository.GetByIdAsync(user.TenantId, CancellationToken.None);
        if (tenant is not null)
        {
            ((ClaimsIdentity)principal.Identity!).AddClaim(new Claim("tenant_name", tenant.Name));
        }

        return principal;
    }
}
