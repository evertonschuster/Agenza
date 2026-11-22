using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace Admin.Identity.Client;

public class HttpContextCurrentUserAccessor : ICurrentUserAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpContextCurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public bool IsAuthenticated => AuthenticatedPrincipal is not null;

    public string? Username => AuthenticatedPrincipal?.FindFirst("name")?.Value;

    public string? Email => AuthenticatedPrincipal?.FindFirst("email")?.Value;

    public Guid? UserId
    {
        get
        {
            var claim = CurrentPrincipal?.FindFirst("sub");
            return claim is not null && Guid.TryParse(claim.Value, out var userId) ? userId : null;
        }
    }

    private ClaimsPrincipal? CurrentPrincipal => _httpContextAccessor.HttpContext?.User;

    private ClaimsPrincipal? AuthenticatedPrincipal =>
        CurrentPrincipal is { Identity.IsAuthenticated: true } principal ? principal : null;
}
