using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Admin.Identity.Client;

// Fail-closed: a missing/unparseable header, missing claim, or mismatch all
// Forbid - never falls through to trusting the header alone.
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
