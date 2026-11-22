using System.Security.Claims;
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

    public string? TenantName
    {
        get
        {
            var principal = AuthenticatedPrincipal;
            return TenantAuthorizationExtensions.TryGetTenantId(principal, out _)
                ? principal?.FindFirst("tenant_name")?.Value
                : null;
        }
    }

    public Guid TenantId
    {
        get
        {
            if (TryGetTenantId(out var tenantId))
            {
                return tenantId;
            }

            throw new InvalidOperationException("The current principal has no valid 'tenant_id' claim.");
        }
    }

    public bool TryGetTenantId(out Guid tenantId)
    {
        return TenantAuthorizationExtensions.TryGetTenantId(CurrentPrincipal, out tenantId);
    }

    private ClaimsPrincipal? CurrentPrincipal => _httpContextAccessor.HttpContext?.User;

    private ClaimsPrincipal? AuthenticatedPrincipal =>
        CurrentPrincipal is { Identity.IsAuthenticated: true } principal ? principal : null;
}
