using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Admin.Identity.Client;

/// <summary>
/// Repo non-negotiable: every request needs a tenant id, and it's never
/// trusted from the client without verifying it against the
/// authenticated principal (root CLAUDE.md). The client sends its tenant
/// in the X-Tenant-Id header by default; this filter rejects a request
/// before it reaches the controller unless that header is present and
/// equals the principal's tenant_id claim - so every action that needs a
/// tenant can trust ITenantAccessor.TenantId without repeating that check
/// itself. Actions that genuinely aren't tenant-scoped (M2M provisioning,
/// OIDC protocol endpoints) opt out with [IgnoreTenant].
/// </summary>
public class TenantHeaderFilter : IAsyncActionFilter
{
    public const string HeaderName = "X-Tenant-Id";

    private readonly ITenantAccessor _tenantAccessor;

    public TenantHeaderFilter(ITenantAccessor tenantAccessor)
    {
        _tenantAccessor = tenantAccessor;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (context.ActionDescriptor is ControllerActionDescriptor descriptor
            && (descriptor.MethodInfo.GetCustomAttributes(typeof(IgnoreTenantAttribute), inherit: true).Length > 0
                || descriptor.ControllerTypeInfo.GetCustomAttributes(typeof(IgnoreTenantAttribute), inherit: true).Length > 0))
        {
            await next();
            return;
        }

        if (!context.HttpContext.Request.Headers.TryGetValue(HeaderName, out var headerValues)
            || !Guid.TryParse(headerValues.ToString(), out var headerTenantId)
            || !_tenantAccessor.TryGetTenantId(out var claimTenantId)
            || headerTenantId != claimTenantId)
        {
            context.Result = new ForbidResult();
            return;
        }

        await next();
    }
}
