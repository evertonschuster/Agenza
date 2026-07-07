using IdentityService.Application.UseCases.ProvisionTenant;
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
[Route("internal/tenants")]
[Authorize(AuthenticationSchemes = OpenIddictValidationAspNetCoreDefaults.AuthenticationScheme)]
public class TenantsController : ControllerBase
{
    private readonly ProvisionTenantUseCase _provisionTenant;

    public TenantsController(ProvisionTenantUseCase provisionTenant)
    {
        _provisionTenant = provisionTenant;
    }

    public record ProvisionTenantBody(string TenantName, string OwnerEmail, string OwnerPassword);

    [HttpPost]
    public async Task<IActionResult> Provision(ProvisionTenantBody body, CancellationToken cancellationToken)
    {
        if (!User.HasScope("identity-admin"))
        {
            return Forbid();
        }

        var result = await _provisionTenant.ExecuteAsync(
            new ProvisionTenantRequest(body.TenantName, body.OwnerEmail, body.OwnerPassword),
            cancellationToken);

        return Created($"/internal/tenants/{result.TenantId}", result);
    }
}
