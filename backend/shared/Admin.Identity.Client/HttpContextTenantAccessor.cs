using Microsoft.AspNetCore.Http;

namespace Admin.Identity.Client;

// Reads tenant_id from the authenticated principal's claims - never from a client-supplied value.
public class HttpContextTenantAccessor : ITenantAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpContextTenantAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid TenantId
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst("tenant_id")
                ?? throw new InvalidOperationException("The current principal has no 'tenant_id' claim.");

            return Guid.Parse(claim.Value);
        }
    }

    public bool TryGetTenantId(out Guid tenantId)
    {
        var claim = _httpContextAccessor.HttpContext?.User.FindFirst("tenant_id");
        if (claim is not null && Guid.TryParse(claim.Value, out tenantId))
        {
            return true;
        }

        tenantId = Guid.Empty;
        return false;
    }
}
