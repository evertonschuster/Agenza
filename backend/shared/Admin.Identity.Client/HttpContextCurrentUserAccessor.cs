using Microsoft.AspNetCore.Http;

namespace Admin.Identity.Client;

public class HttpContextCurrentUserAccessor : ICurrentUserAccessor
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public HttpContextCurrentUserAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated == true;

    public string? Username => IsAuthenticated ? _httpContextAccessor.HttpContext?.User.FindFirst("name")?.Value : null;

    public string? Email => IsAuthenticated ? _httpContextAccessor.HttpContext?.User.FindFirst("email")?.Value : null;

    public Guid? UserId
    {
        get
        {
            var claim = _httpContextAccessor.HttpContext?.User.FindFirst("sub");
            return claim is not null && Guid.TryParse(claim.Value, out var userId) ? userId : null;
        }
    }
}
