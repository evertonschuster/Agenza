using System.Security.Claims;
using IdentityService.Api.Setup;
using IdentityService.Infrastructure.Identity;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;

namespace IdentityService.Api.Controllers;

public sealed class AuthorizationController(
    OAuthGrantPolicy grantPolicy,
    SignInManager<ApplicationUser> signInManager,
    UserManager<ApplicationUser> userManager) : Controller
{
    [HttpGet("~/connect/authorize")]
    [HttpPost("~/connect/authorize")]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Authorize(CancellationToken cancellationToken)
    {
        var request = HttpContext.GetOpenIddictServerRequest()
            ?? throw new InvalidOperationException("The OpenID Connect request cannot be retrieved.");
        var grant = await grantPolicy.ResolveAsync(request.ClientId!, request.GetScopes(), request.GetResources(),
            previousGrant: null, cancellationToken);
        if (grant.IsFailure)
        {
            return Reject(grant.Error.Code);
        }

        var authentication = await HttpContext.AuthenticateAsync(IdentityConstants.ApplicationScheme);
        if (authentication is not { Succeeded: true })
        {
            return Challenge(
                authenticationSchemes: IdentityConstants.ApplicationScheme,
                properties: new AuthenticationProperties
                {
                    RedirectUri = Request.PathBase + Request.Path + QueryString.Create(
                        Request.HasFormContentType ? Request.Form.ToList() : Request.Query.ToList()),
                });
        }

        var user = await userManager.GetUserAsync(authentication.Principal);
        if (user is null || !await CanSignInAsync(user))
        {
            return Reject(OpenIddictConstants.Errors.LoginRequired);
        }

        return SignIn(await CreatePrincipalAsync(user, grant.Value), OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
    }

    [HttpPost("~/connect/token")]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Exchange(CancellationToken cancellationToken)
    {
        var request = HttpContext.GetOpenIddictServerRequest()
            ?? throw new InvalidOperationException("The OpenID Connect request cannot be retrieved.");
        if (request.IsAuthorizationCodeGrantType() || request.IsRefreshTokenGrantType())
        {
            var authentication = await HttpContext.AuthenticateAsync(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
            if (!authentication.Succeeded || authentication.Principal is null)
            {
                return Reject(OpenIddictConstants.Errors.InvalidGrant);
            }

            var previous = authentication.Principal;
            var user = await userManager.GetUserAsync(previous);
            if (user is null || !await CanSignInAsync(user)
                || !Guid.TryParse(previous.FindFirst("tenant_id")?.Value, out var previousTenant)
                || previousTenant != user.TenantId)
            {
                return Reject(OpenIddictConstants.Errors.InvalidGrant);
            }

            var grant = await grantPolicy.ResolveAsync(request.ClientId!, request.GetScopes(), request.GetResources(),
                previous, cancellationToken);
            if (grant.IsFailure)
            {
                return Reject(grant.Error.Code);
            }

            return SignIn(await CreatePrincipalAsync(user, grant.Value), OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        if (request.IsClientCredentialsGrantType())
        {
            var grant = await grantPolicy.ResolveAsync(request.ClientId!, request.GetScopes(), request.GetResources(),
                previousGrant: null, cancellationToken);
            if (grant.IsFailure)
            {
                return Reject(grant.Error.Code);
            }

            var identity = new ClaimsIdentity(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
                OpenIddictConstants.Claims.Name, OpenIddictConstants.Claims.Role);
            identity.SetClaim(OpenIddictConstants.Claims.Subject, request.ClientId);
            identity.SetClaim(OpenIddictConstants.Claims.Name, request.ClientId);
            var principal = new ClaimsPrincipal(identity);
            ApplyGrant(principal, grant.Value);
            return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        return Reject(OpenIddictConstants.Errors.UnsupportedGrantType);
    }

    private async Task<bool> CanSignInAsync(ApplicationUser user)
    {
        return await signInManager.CanSignInAsync(user) && !await userManager.IsLockedOutAsync(user);
    }

    private ForbidResult Reject(string error)
    {
        return Forbid(
            authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
            properties: new AuthenticationProperties(new Dictionary<string, string?>
            {
                [OpenIddictServerAspNetCoreConstants.Properties.Error] = error,
            }));
    }

    private async Task<ClaimsPrincipal> CreatePrincipalAsync(ApplicationUser user, OAuthGrant grant)
    {
        var principal = await signInManager.CreateUserPrincipalAsync(user);
        ApplyGrant(principal, grant);
        return principal;
    }

    private static void ApplyGrant(ClaimsPrincipal principal, OAuthGrant grant)
    {
        principal.SetScopes(grant.Scopes);
        principal.SetResources(grant.Resources);
        foreach (var claim in principal.Claims)
        {
            claim.SetDestinations(GetDestinations(claim, principal));
        }
    }

    private static IEnumerable<string> GetDestinations(Claim claim, ClaimsPrincipal principal)
    {
        if (claim.Type == "AspNet.Identity.SecurityStamp")
        {
            yield break;
        }

        yield return OpenIddictConstants.Destinations.AccessToken;
        if ((claim.Type == OpenIddictConstants.Claims.Name && principal.HasScope(OpenIddictConstants.Scopes.Profile))
            || (claim.Type == OpenIddictConstants.Claims.Email && principal.HasScope(OpenIddictConstants.Scopes.Email))
            || (claim.Type == "tenant_id" && principal.HasScope("tenant_id")))
        {
            yield return OpenIddictConstants.Destinations.IdentityToken;
        }
    }
}
