using Admin.SharedKernel;
using Asp.Versioning;
using IdentityService.Application.Tenants.ProvisionTenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Abstractions;
using OpenIddict.Validation.AspNetCore;

namespace IdentityService.Api.Controllers;

/// <summary>
/// Internal tenant/owner provisioning. Not exposed to end users - there is
/// no public signup flow in v1 (docs/DOMAIN.md). Callers must present an
/// M2M token carrying the "identity-admin" scope.
/// </summary>
[ApiController]
[ApiVersion("1.0")]
[Route("internal/v{version:apiVersion}/tenants")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public class TenantsController : ControllerBase
{
    private readonly IDispatcher _dispatcher;

    public TenantsController(IDispatcher dispatcher)
    {
        _dispatcher = dispatcher;
    }

    public record ProvisionTenantBody(string TenantName, string OwnerEmail, string OwnerPassword);

    [HttpPost]
    public async Task<IActionResult> Provision(ProvisionTenantBody body, CancellationToken cancellationToken)
    {
        if (!User.HasScope("identity-admin"))
        {
            return Forbid();
        }

        var command = new ProvisionTenantCommand(body.TenantName, body.OwnerEmail, body.OwnerPassword);
        var result = await _dispatcher.Send(command, cancellationToken);

        return result.ToActionResult(
            this,
            tenant => Created($"/internal/v1/tenants/{tenant.TenantId}", tenant));
    }
}
