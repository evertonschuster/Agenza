using Microsoft.AspNetCore.Identity;

namespace IdentityService.Infrastructure.Identity;

/// <summary>
/// ASP.NET Core Identity's persistence model for a user account. Lives in
/// Infrastructure (not Domain) because it is inherently a framework/
/// persistence concern - the business concept "a User belongs to one
/// Tenant" (docs/DOMAIN.md) is carried by the TenantId property here and
/// surfaced to Application through IUserAccountService, not by exposing
/// this type upward.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    public Guid TenantId { get; set; }
}
