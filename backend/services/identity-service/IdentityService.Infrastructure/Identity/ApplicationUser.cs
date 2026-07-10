using Microsoft.AspNetCore.Identity;

namespace IdentityService.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<Guid>
{
    public Guid TenantId { get; set; }
}
