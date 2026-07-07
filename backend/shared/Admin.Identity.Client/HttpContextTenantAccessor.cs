using Microsoft.AspNetCore.Http;

namespace Admin.Identity.Client;

/// <summary>
/// Reads tenant_id from the authenticated principal's claims - never from
/// a client-supplied route/query/body value. Every microservice (repo
/// non-negotiable) must scope its queries to a tenant verified against the
/// authenticated principal, not trusted from the client.
/// </summary>
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
}
