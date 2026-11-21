using System.Collections.Immutable;
using System.Security.Claims;
using IdentityService.Infrastructure.Identity;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;

namespace IdentityService.Api.Controllers;

public sealed class AuthorizationController(
    IOpenIddictScopeManager scopeManager,
    IConfiguration configuration,
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

        var principal = await signInManager.CreateUserPrincipalAsync(user);
        var error = await ApplyGrantAsync(principal, request, previousGrant: null, cancellationToken);
        if (error is not null)
        {
            return Reject(error);
        }

        return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
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

            var principal = await signInManager.CreateUserPrincipalAsync(user);
            var error = await ApplyGrantAsync(principal, request, previous, cancellationToken);
            if (error is not null)
            {
                return Reject(error);
            }

            return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        if (request.IsClientCredentialsGrantType())
        {
            var identity = new ClaimsIdentity(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
                OpenIddictConstants.Claims.Name, OpenIddictConstants.Claims.Role);
            identity.SetClaim(OpenIddictConstants.Claims.Subject, request.ClientId);
            identity.SetClaim(OpenIddictConstants.Claims.Name, request.ClientId);
            var principal = new ClaimsPrincipal(identity);
            var error = await ApplyGrantAsync(principal, request, previousGrant: null, cancellationToken);
            if (error is not null)
            {
                return Reject(error);
            }

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

    private async Task<string?> ApplyGrantAsync(
        ClaimsPrincipal principal,
        OpenIddictRequest request,
        ClaimsPrincipal? previousGrant,
        CancellationToken cancellationToken)
    {
        var scopes = request.GetScopes();
        if (previousGrant is not null)
        {
            var originalScopes = previousGrant.GetScopes();
            if (scopes.Length == 0)
            {
                scopes = originalScopes;
            }

            scopes = scopes.Intersect(originalScopes, StringComparer.Ordinal).ToImmutableArray();
        }

        var resources = await scopeManager.ListResourcesAsync(scopes, cancellationToken).ToListAsync(cancellationToken);
        if (previousGrant is not null)
        {
            var originalResources = previousGrant.GetResources();
            resources = resources.Intersect(originalResources, StringComparer.Ordinal).ToList();
            if (originalResources.Length > 0 && resources.Count == 0)
            {
                return OpenIddictConstants.Errors.InvalidGrant;
            }
        }

        var targets = request.GetResources();
        if (targets.Any(target => !resources.Contains(target, StringComparer.Ordinal)))
        {
            return OpenIddictConstants.Errors.InvalidTarget;
        }

        if (targets.Length > 0)
        {
            resources = resources.Intersect(targets, StringComparer.Ordinal).ToList();
        }
        else if (previousGrant is null && configuration["OAuth:DefaultResource"] is { } defaultResource
            && resources.Contains(defaultResource, StringComparer.Ordinal))
        {
            resources = [defaultResource];
        }

        principal.SetScopes(scopes);
        principal.SetResources(resources);
        foreach (var claim in principal.Claims)
        {
            claim.SetDestinations(GetDestinations(claim, principal));
        }

        return null;
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
